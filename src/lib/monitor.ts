/**
 * مانیتورینگ داخلی سامانه (Self-Monitoring)
 * ─────────────────────────────────────────
 * هر ۶۰ ثانیه یک «تیک» اجرا می‌شود و این کارها را انجام می‌دهد:
 *   ۱) سلامت دیتابیس (SELECT 1) را می‌سنجد.
 *   ۲) «ضربان» (heartbeat) را در جدول Setting ثبت می‌کند — با خالی‌ماندن
 *      این ضربان در بوتِ بعدی، مدت قطعی برق/کرش/ری‌استارت سرور قابل محاسبه است.
 *   ۳) بعد از هر بوت، به همهٔ مدیرانِ متصلِ بات بله پیام می‌دهد:
 *      «سامانه بالا آمد — مدت خارج از سرویس: X دقیقه (از ساعت a تا b)».
 *   ۴) هشدار حافظهٔ بالا و فضای کم دیسک را هم (با محدودیت زمانی تا اسپم نشود)
 *      به مدیران می‌فرستد.
 *
 * محل فعال‌سازی: src/instrumentation.ts (و به‌صورت دستی در scripts/start-3003.js
 * از طریق همان فایل) — پس هر بار برنامه بالا بیاید، مانیتور هم بالا می‌آید.
 *
 * اگر کل برنامه دان باشد، این ماژول هم خاموش است؛ در آن حالت «پایشگر بیرونی»
 * (scripts/monitor-app.ps1 — وظیفهٔ زمان‌بندی uastemdad-monitor) وارد عمل می‌شود:
 * راه‌اندازی مجدد خودکار + پیام بله (اگر MONITOR_CHAT_ID در .env ست شده باشد).
 */
import { statfsSync } from "node:fs";
import { db } from "@/lib/db";
import { botToken, sendMessage, siteUrl } from "@/lib/bale/api";
import { logBot } from "@/lib/bale/session";

const HEARTBEAT_KEY = "monitorLastBeat";
const TICK_MS = 60_000;
/** فاصلهٔ بیشتر از این مقدار بین دو ضربان = «قطعی» واقعی */
const DOWNTIME_THRESHOLD_MS = 2 * 60_000;
/** حد هشدار حافظهٔ پروسه (مگابایت) */
const MEM_WARN_MB = 1400;
/** حد هشدار فضای خالی دیسک (گیگابایت) */
const DISK_WARN_GB = 2;

interface MonitorGlobal {
  timer?: ReturnType<typeof setInterval>;
  startedAt?: Date;
  lastTickAt?: Date;
  lastDbOk?: boolean;
  dbDownSince: Date | null;
  dbDownNotified: boolean;
  lastMemWarnAt: number;
  lastDiskWarnAt: number;
  bootReportDone: boolean;
}

const g = globalThis as unknown as { __uastemdadMonitor?: MonitorGlobal };

function mon(): MonitorGlobal {
  if (!g.__uastemdadMonitor) {
    g.__uastemdadMonitor = {
      dbDownSince: null,
      dbDownNotified: false,
      lastMemWarnAt: 0,
      lastDiskWarnAt: 0,
      bootReportDone: false,
    };
  }
  return g.__uastemdadMonitor;
}

/** وضعیت مانیتور برای نمایش در /api/health و پنل مدیریت */
export function monitorStatus() {
  const m = mon();
  return {
    enabled: !!m.timer,
    startedAt: m.startedAt ?? null,
    lastTickAt: m.lastTickAt ?? null,
    lastDbOk: m.lastDbOk ?? null,
  };
}

// --------------------------- ابزارهای کمکی ---------------------------

function faTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "Asia/Tehran",
    }).format(d);
  } catch {
    return d.toISOString().replace("T", " ").slice(0, 19);
  }
}

function faDuration(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} دقیقه`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ساعت و ${m} دقیقه` : `${h} ساعت`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** ارسال پیام پایش به همهٔ مدیرانِ متصل بات بله */
async function notifyAdmins(text: string, action = "MONITOR_NOTIFY"): Promise<boolean> {
  if (!botToken()) return false;
  try {
    const admins = await db.botAdmin.findMany({
      where: { isActive: true },
      select: { chatId: true },
    });
    let sent = 0;
    for (const a of admins) {
      const res = await sendMessage(a.chatId, text);
      if (res.ok) sent++;
      // فاصلهٔ کوتاه بین پیام‌ها برای جلوگیری از rate-limit
      await new Promise((r) => setTimeout(r, 300));
    }
    await logBot(action, `sent=${sent}/${admins.length}`);
    return sent > 0;
  } catch (e) {
    await logBot(
      action,
      `failed: ${e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200)}`
    );
    return false;
  }
}

async function readHeartbeat(): Promise<Date | null> {
  try {
    const row = await db.setting.findUnique({ where: { key: HEARTBEAT_KEY } });
    if (!row) return null;
    const v = Number(row.value);
    return Number.isFinite(v) && v > 0 ? new Date(v) : null;
  } catch {
    return null;
  }
}

async function writeHeartbeat(): Promise<void> {
  try {
    const now = Date.now();
    await db.setting.upsert({
      where: { key: HEARTBEAT_KEY },
      create: { key: HEARTBEAT_KEY, value: String(now) },
      update: { value: String(now) },
    });
  } catch {
    // دیتابیس در دسترس نیست — تیک بعدی دوباره تلاش می‌کند
  }
}

/** فضای خالی دیسکِ پوشهٔ برنامه (گیگابایت) — در صورت خطا null */
function diskFreeGb(): number | null {
  try {
    const s = statfsSync(process.cwd());
    return (s.bavail * s.bsize) / 1024 ** 3;
  } catch {
    return null;
  }
}

// --------------------------- تیک اصلی ---------------------------

async function tick(): Promise<void> {
  const m = mon();
  m.lastTickAt = new Date();

  // ۱) سلامت دیتابیس
  let dbOk = true;
  let dbErr = "";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    dbOk = false;
    dbErr = e instanceof Error ? e.message.slice(0, 150) : String(e).slice(0, 150);
  }
  m.lastDbOk = dbOk;

  if (!dbOk) {
    await logBot("MONITOR_DB_DOWN", dbErr);
    if (!m.dbDownSince) m.dbDownSince = new Date();
    if (!m.dbDownNotified) {
      m.dbDownNotified = true;
      await notifyAdmins(
        `🔴 <b>دیتابیس سامانه پاسخ نمی‌دهد</b>\n` +
          `🏫 ${siteUrl()}\n` +
          `🕐 زمان: ${faTime(new Date())}\n` +
          `⚠️ خطا: ${esc(dbErr)}\n\n` +
          `اقدام پیشنهادی: اجرای start-app.ps1 -Restart روی سرور؛ اگر تکرار شد لاگ را ببینید:\n` +
          `Get-Content C:\\uastemdad\\logs\\app.log -Tail 50`,
        "MONITOR_DB_DOWN"
      );
    }
    return;
  }

  // ضربان قبلی را «قبل از» نوشتن ضربان جدید می‌خوانیم تا فاصلهٔ قطعی درست باشد
  const prevBeat = await readHeartbeat();
  await writeHeartbeat();

  // ۲) گزارش بالا آمدن — فقط یک‌بار در هر بوت
  if (!m.bootReportDone) {
    m.bootReportDone = true;
    const gapMs = prevBeat ? Date.now() - prevBeat.getTime() : null;
    if (gapMs === null) {
      await notifyAdmins(
        `🟢 <b>سامانهٔ پایش برای اولین بار فعال شد</b>\n` +
          `🏫 ${siteUrl()}\n` +
          `از این پس هر بار سامانه دان شود یا بالا بیاید، همین‌جا پیام می‌گیرید.`,
        "MONITOR_BOOT"
      );
    } else if (gapMs !== null && prevBeat && gapMs >= DOWNTIME_THRESHOLD_MS) {
      await notifyAdmins(
        `🟢 <b>سامانه دوباره بالا آمد</b>\n` +
          `🏫 ${siteUrl()}\n` +
          `⏱ مدت خارج از سرویس: ≈ ${faDuration(gapMs)}\n` +
          `🕐 از ${faTime(prevBeat)} تا ${faTime(new Date())}\n\n` +
          `علت‌های احتمالی: کرش پروسه، ری‌استارت سرور، به‌روزرسانی.\n` +
          `برای عیب‌یابی: Get-Content C:\\uastemdad\\logs\\app.log -Tail 50`,
        "MONITOR_RECOVERED"
      );
    } else {
      await notifyAdmins(
        `🟢 <b>سامانه بالا آمد</b> (ری‌استارت سریع — خارج از سرویس کمتر از ۲ دقیقه)\n🏫 ${siteUrl()}`,
        "MONITOR_BOOT"
      );
    }
  }

  // ۳) ریکاوری دیتابیس
  if (m.dbDownSince) {
    const since = m.dbDownSince;
    m.dbDownSince = null;
    m.dbDownNotified = false;
    await notifyAdmins(
      `🟢 <b>دیتابیس دوباره وصل شد</b>\nقطعی از ${faTime(since)} تا ${faTime(new Date())}`,
      "MONITOR_DB_RECOVERED"
    );
  }

  const now = Date.now();

  // ۴) هشدار حافظه (حداکثر هر ۶ ساعت یک‌بار)
  const memMb = process.memoryUsage().rss / 1048576;
  if (memMb > MEM_WARN_MB && now - m.lastMemWarnAt > 6 * 3_600_000) {
    m.lastMemWarnAt = now;
    await notifyAdmins(
      `🟡 <b>حافظهٔ پروسهٔ سامانه بالاست</b>: ${Math.round(memMb)} MB\n` +
        `توصیه: روی سرور اجرا کنید → start-app.ps1 -Restart`,
      "MONITOR_MEM"
    );
  }

  // ۵) هشدار فضای دیسک (حداکثر هر ۱۲ ساعت یک‌بار)
  const free = diskFreeGb();
  if (free !== null && free < DISK_WARN_GB && now - m.lastDiskWarnAt > 12 * 3_600_000) {
    m.lastDiskWarnAt = now;
    await notifyAdmins(
      `🟡 <b>فضای دیسک سرور کم است</b>: فقط ${free.toFixed(1)} GB خالی مانده\n` +
        `توصیه: لاگ‌های قدیمی و فایل‌های اضافی C:\\uastemdad\\logs را پاک کنید.`,
      "MONITOR_DISK"
    );
  }
}

// --------------------------- شروع ---------------------------

/** فعال‌سازی مانیتور — idempotent (فقط یک نمونه در هر پروسه) */
export function startMonitor(): void {
  const m = mon();
  if (m.timer) return;
  m.startedAt = new Date();
  void logBot("MONITOR_START", "");
  console.log("[monitor] self-monitoring فعال شد (هر ۶۰ ثانیه، گزارش بوت و خطا در بات بله)");
  // اولین تیک با تأخیر تا سرور و Prisma کامل بالا بیایند
  setTimeout(() => {
    void tick().catch(() => {});
  }, 20_000);
  m.timer = setInterval(() => {
    void tick().catch(() => {});
  }, TICK_MS);
}
