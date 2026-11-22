/**
 * حلقهٔ long-polling بات بله — فقط یک نمونه در هر پروسه اجرا می‌شود.
 * از طریق src/instrumentation.ts هنگام بالا آمدن سرور Next فعال می‌شود.
 */
import { getUpdates, getMe, deleteWebhook, botToken, type BaleUpdate } from "./api";
import { processUpdate } from "./handlers";
import { logBot } from "./session";

const g = globalThis as unknown as {
  __balePoller?: { running: boolean; offset: number; startedAt: Date };
  __baleStart?: Promise<void>;
  __baleWebhookCleared?: boolean;
};

export function pollerStatus() {
  return g.__balePoller
    ? { running: g.__balePoller.running, startedAt: g.__balePoller.startedAt, offset: g.__balePoller.offset }
    : { running: false, startedAt: null, offset: 0 };
}

export function isBotConfigured(): boolean {
  return !!botToken();
}

export function botEnabled(): boolean {
  const flag = (process.env.BALE_BOT_ENABLED || "true").trim().toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "no";
}

export function startPoller(): Promise<void> {
  // قفل شروع: اگر هم‌زمان از instrumentation و start-3003.js صدا زده شود،
  // فقط یک حلقهٔ polling ساخته می‌شود (جلوگیری از خطای 409)
  if (!g.__baleStart) g.__baleStart = doStartPoller();
  return g.__baleStart;
}

async function doStartPoller(): Promise<void> {
  if (!botToken()) {
    console.log("[bale-bot] BALE_BOT_TOKEN تنظیم نشده است؛ polling غیرفعال ماند.");
    return;
  }
  if (!botEnabled()) {
    console.log("[bale-bot] BALE_BOT_ENABLED=false است؛ polling غیرفعال ماند.");
    return;
  }
  if (g.__balePoller?.running) {
    console.log("[bale-bot] poller از قبل در حال اجراست.");
    return;
  }

  const me = await getMe();
  if (!me.ok) {
    console.error("[bale-bot] getMe ناموفق بود؛ poller شروع نشد:", me.description);
    await logBot("POLLER_START_FAILED", me.description || "");
    return;
  }

  g.__baleWebhookCleared = false;

  // احتیاط: اگر روزی وب‌هوک روی بات مانده باشد، همان اول پاک می‌کنیم تا getUpdates
  // خطای 409 نگیرد (متد بی‌ضرر و idempotent است)
  const wh0 = await deleteWebhook();
  if (!wh0.ok) {
    console.error("[bale-bot] پاک‌سازی احتیاطی وب‌هوک ناموفق بود (غیرمانع‌ساز):", wh0.description);
  }

  g.__balePoller = { running: true, offset: 0, startedAt: new Date() };
  console.log(`[bale-bot] polling برای @${me.result?.username} آغاز شد.`);
  await logBot("POLLER_START", `@${me.result?.username || ""}`);

  // حلقهٔ اصلی — هرگز پرتاب استثنا نمی‌کند
  void (async () => {
    let consecutiveErrors = 0;
    while (g.__balePoller?.running) {
      try {
        const res = await getUpdates(g.__balePoller.offset, 25);
        if (res.ok && Array.isArray(res.result)) {
          consecutiveErrors = 0;
          for (const upd of res.result as BaleUpdate[]) {
            g.__balePoller.offset = Math.max(g.__balePoller.offset, upd.update_id + 1);
            // پردازش موازی آپدیت‌ها تا آلبوم عکس‌ها گلوگاه نشود
            void processUpdate(upd);
          }
        } else {
          consecutiveErrors++;
          // 409 یعنی یا نمونهٔ دیگری polling می‌کند یا وب‌هوک قدیمی مانده —
          // یک‌بار در هر اجرا، وب‌هوک را پاک می‌کنیم و بلافاصله ادامه می‌دهیم
          if (res.error_code === 409 && !g.__baleWebhookCleared) {
            g.__baleWebhookCleared = true;
            console.error("[bale-bot] خطای 409 — پاک‌کردن وب‌هوک قدیمی و ادامهٔ polling ...");
            const wh = await deleteWebhook();
            if (wh.ok) { consecutiveErrors = 0; continue; }
          }
          if (consecutiveErrors % 10 === 1) {
            console.error("[bale-bot] getUpdates error:", res.description);
            await logBot("POLL_ERROR", res.description || "");
          }
          await new Promise((r) => setTimeout(r, Math.min(5000 * consecutiveErrors, 30000)));
        }
      } catch (e) {
        consecutiveErrors++;
        console.error("[bale-bot] poll loop error:", e);
        await new Promise((r) => setTimeout(r, Math.min(5000 * consecutiveErrors, 30000)));
      }
    }
  })();
}

export function stopPoller() {
  if (g.__balePoller) g.__balePoller.running = false;
}
