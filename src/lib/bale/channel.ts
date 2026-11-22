/**
 * انتشار خودکار پست‌های کانال بله در سایت
 * ─────────────────────────────────────────
 * مدیر اخبار، خبر یا اطلاعیه را در کانال بله می‌نویسد (متن و عکس)؛
 * بات همان پست را به‌صورت خبر/اطلاعیه در سایت منتشر می‌کند و به
 * مدیران متصل بات اطلاع‌رسانی می‌شود.
 *
 * راه‌اندازی یک‌باره:
 *   ۱) بات را در کانال به‌عنوان مدیر (Admin) اضافه کنید
 *   ۲) شناسهٔ کانال را تنظیم کنید — یا از پنل مدیریت (بخش بات ← شناسهٔ کانال)
 *      یا متغیر BALE_CHANNEL_ID در فایل .env
 *      (ترفند: یک پست از کانال را به گفتگوی بات فوروارد کنید تا شناسه را نشان دهد)
 *   ۳) از این به بعد هر پست کانال خودکار در سایت منتشر می‌شود
 *
 * تشخیص نوع: اگر متن با «اطلاعیه» یا 📢 شروع شود = اطلاعیه، در غیر این صورت = خبر.
 * عنوان = سطر اول متن/کپشن؛ بقیه = متن کامل پست در سایت.
 */
import crypto from "crypto";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { slugify } from "@/lib/admin-api";
import { downloadFile, sendMessage, siteUrl, type BaleMessage } from "./api";
import { clip, esc, faDate, faNum, textToHtml } from "./text";
import { logBot } from "./session";

const g = globalThis as unknown as {
  __baleAlbums?: Map<string, { msgs: BaleMessage[]; timer?: NodeJS.Timeout }>;
};

/** شناسهٔ کانال: اول تنظیم پنل (جدول Setting با کلید baleChannelId)، بعد متغیر محیطی */
export async function getChannelId(): Promise<string> {
  let id = (process.env.BALE_CHANNEL_ID || "").trim();
  try {
    const s = await getSettings();
    if (s.baleChannelId) id = s.baleChannelId.trim();
  } catch {
    // اگر دیتابیس در دسترس نبود، متغیر محیطی ملاک است
  }
  return id;
}

/** تطبیق پیام کانال با شناسهٔ تنظیم‌شده (@username یا شناسهٔ عددی با/بدون -100) */
function matchesChannel(msg: BaleMessage, id: string): boolean {
  const norm = (s: string) => s.replace(/[^\d]/g, "");
  const target = id.trim().toLowerCase();
  if (!target) return false;
  const uname = (msg.chat.username || "").toLowerCase();
  if (target.startsWith("@") && uname === target.slice(1)) return true;
  if (!target.startsWith("@") && uname === target) return true;
  const digits = norm(target);
  if (!digits) return false;
  return norm(String(msg.chat.id || "")) === digits;
}

/** سطر اول = عنوان، بقیه = متن کامل */
function splitTitle(raw: string): { title: string; body: string } {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { title: "", body: "" };
  const idx = text.indexOf("\n");
  const first = (idx === -1 ? text : text.slice(0, idx)).trim();
  const rest = idx === -1 ? "" : text.slice(idx + 1).trim();
  return { title: clip(first, 120), body: rest || first };
}

/** اگر متن با «اطلاعیه» یا 📢 شروع شود = اطلاعیه، در غیر این صورت = خبر */
function detectType(text: string): "NEWS" | "ANNOUNCEMENT" {
  const t = String(text || "").trim();
  if (/^📢/.test(t) || /^اطلاعیه|آگهی|اعلامیه|ابلاغیه/.test(t)) return "ANNOUNCEMENT";
  return "NEWS";
}

/** ذخیرهٔ عکس کانال در پوشهٔ آپلود سایت */
async function savePhoto(fileId: string): Promise<string | null> {
  try {
    const dl = await downloadFile(fileId);
    if (!dl.ok || !dl.buf) return null;
    const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const name = `ch-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.jpg`;
    await writeFile(path.join(dir, name), dl.buf);
    return `/uploads/${name}`;
  } catch {
    return null;
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  for (let i = 2; i < 50; i++) {
    const exists = await db.post.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** آلبوم‌های چندعکسی با media_group_id می‌آیند (هر عکس یک channel_post جدا) — ۲ ثانیه جمع می‌کنیم */
function bufferAlbum(msg: BaleMessage) {
  if (!g.__baleAlbums) g.__baleAlbums = new Map();
  const key = msg.media_group_id || "";
  if (!key) {
    void publishFromChannel([msg]);
    return;
  }
  let bucket = g.__baleAlbums.get(key);
  if (!bucket) {
    bucket = { msgs: [] };
    g.__baleAlbums.set(key, bucket);
    bucket.timer = setTimeout(() => {
      g.__baleAlbums?.delete(key);
      void publishFromChannel(bucket!.msgs);
    }, 2000);
  }
  bucket.msgs.push(msg);
}

/** انتشار پست کانال در سایت + اطلاع‌رسانی به مدیران متصل بات */
async function publishFromChannel(msgs: BaleMessage[]): Promise<void> {
  const first = msgs[0];
  if (!first) return;
  try {
    const chat = first.chat;
    const text = first.caption || first.text || "";
    if (!text.trim() && !(first.photo?.length || msgs.some((m) => m.photo?.length))) return;

    const { title, body } = splitTitle(text);
    if (!title) {
      console.error("[bale-bot] پست کانال بدون عنوان (متن/کپشن خالی) — منتشر نشد");
      return;
    }
    const type = detectType(text);

    // جلوگیری از ثبت تکراری (بعد از ری‌استارت، آخرین دستهٔ getUpdates ممکن است دوباره برسد)
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const dupe = await db.post.findFirst({
      where: { source: "BALE_CHANNEL", title, createdAt: { gte: since } },
    });
    if (dupe) return;

    // دریافت و ذخیرهٔ عکس‌ها (اولین عکس = تصویر شاخص)
    const images: string[] = [];
    for (const m of msgs) {
      const best = m.photo?.[m.photo.length - 1];
      if (!best) continue;
      const url = await savePhoto(best.file_id);
      if (url) images.push(url);
    }

    const post = await db.post.create({
      data: {
        title,
        slug: await uniqueSlug(title),
        excerpt: clip(body.replace(/\s+/g, " ").trim(), 160),
        content: textToHtml(body),
        coverImage: images[0] || null,
        images: JSON.stringify(images),
        source: "BALE_CHANNEL",
        type,
        published: true,
        publishedAt: new Date(),
        categoryId: null,
      },
    });

    const kind = type === "ANNOUNCEMENT" ? "اطلاعیه" : "خبر";
    await logBot("CHANNEL_PUBLISH", `${kind} از کانال «${chat.title || chat.username || ""}»: ${title}`, String(chat.id || ""));
    console.log(`[bale-bot] پست کانال در سایت منتشر شد (${kind}): ${title}`);

    // اطلاع‌رسانی به مدیران متصل بات
    const admins = await db.botAdmin.findMany({ where: { isActive: true } });
    const seg = type === "ANNOUNCEMENT" ? "announcements" : "news";
    const note =
      `📡 <b>پست کانال در سایت منتشر شد</b>\n━━━━━━━━━━━━━━\n\n` +
      `${type === "ANNOUNCEMENT" ? "📢" : "📰"} <b>${kind}:</b> ${esc(title)}\n` +
      `🗂 منبع: کانال «${esc(chat.title || chat.username || "")}»\n` +
      (images.length ? `🖼 تعداد عکس: ${faNum(images.length)} (اولین عکس، تصویر شاخص)\n` : "") +
      `🗓 ${faDate(post.publishedAt)}`;
    for (const a of admins) {
      await sendMessage(a.chatId, note, {
        inline_keyboard: [
          [
            { text: "🌐 مشاهده در سایت", url: `${siteUrl()}/${seg}/${encodeURIComponent(post.slug)}` },
            { text: "🗑 حذف", callback_data: `del:${post.id}` },
          ],
        ],
      });
    }
  } catch (e) {
    console.error("[bale-bot] channel publish error:", e);
    await logBot("CHANNEL_ERROR", e instanceof Error ? e.message : String(e));
  }
}

/** ورودی اصلی: هر channel_post که از getUpdates می‌رسد */
export async function handleChannelPost(msg: BaleMessage): Promise<void> {
  try {
    if (msg.chat?.type !== "channel") return;
    const id = await getChannelId();

    if (!id) {
      // شناسه هنوز تنظیم نشده — فقط راهنمایی در لاگ (بدون انتشار)
      console.log(
        `[bale-bot] channel_post از کانال «${msg.chat.title || msg.chat.username || "?"}» دریافت شد — ` +
          `شناسهٔ کانال: ${msg.chat.id}${msg.chat.username ? ` (@${msg.chat.username})` : ""} — ` +
          `برای انتشار خودکار در سایت، شناسه را در پنل مدیریت (بخش بات) یا BALE_CHANNEL_ID در .env ثبت کنید`
      );
      return;
    }
    if (!matchesChannel(msg, id)) return;

    bufferAlbum(msg);
  } catch (e) {
    console.error("[bale-bot] channel post handler error:", e);
    await logBot("CHANNEL_ERROR", e instanceof Error ? e.message : String(e));
  }
}
