/**
 * کلاینت سبک Bot API پیام‌رسان بله
 * مستندات: https://docs.bale.ai  —  پایه: https://tapi.bale.ai/bot<token>/<method>
 */

export const BALE_API_BASE = "https://tapi.bale.ai";

export function botToken(): string {
  return (process.env.BALE_BOT_TOKEN || "").trim();
}

export function siteUrl(): string {
  const u = (process.env.SITE_URL || "https://uastemdad.ir").trim();
  return u.replace(/\/+$/, "");
}

export interface BaleResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/** فراخوانی یک متد API بله با بدنهٔ JSON */
export async function call<T = unknown>(
  method: string,
  payload?: Record<string, unknown>,
  timeoutMs = 40000
): Promise<BaleResponse<T>> {
  const token = botToken();
  if (!token) return { ok: false, description: "BALE_BOT_TOKEN تنظیم نشده است" };
  try {
    const res = await fetch(`${BALE_API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await res.json().catch(() => null)) as BaleResponse<T> | null;
    if (!json) return { ok: false, description: `پاسخ نامعتبر HTTP ${res.status}` };
    return json;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, description: msg };
  }
}

// --------------------------- تایپ‌های اصلی ---------------------------

export interface BaleUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface BaleChat {
  id: number;
  type?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  title?: string;
}

export interface BalePhotoSize {
  file_id: string;
  file_unique_id?: string;
  width?: number;
  height?: number;
  file_size?: number;
}

export interface BaleFile {
  file_id: string;
  file_unique_id?: string;
  file_size?: number;
  file_path?: string;
}

export interface BaleMessage {
  message_id: number;
  from?: BaleUser;
  chat: BaleChat;
  date?: number;
  text?: string;
  caption?: string;
  photo?: BalePhotoSize[];
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
  video?: { file_id: string; mime_type?: string };
}

export interface BaleCallbackQuery {
  id: string;
  from: BaleUser;
  data?: string;
  message?: BaleMessage;
}

export interface BaleUpdate {
  update_id: number;
  message?: BaleMessage;
  edited_message?: BaleMessage;
  callback_query?: BaleCallbackQuery;
}

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboard {
  inline_keyboard: InlineButton[][];
}

/** اطلاعات بات از getMe */
export interface BotInfo {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

// --------------------------- متدهای پرکاربرد ---------------------------

export async function getMe(): Promise<BaleResponse<BotInfo>> {
  return call<BotInfo>("getMe", {}, 15000);
}

/**
 * حذف وب‌هوک — اگر روزی روی بات وب‌هوک تنظیم شده باشد، getUpdates با خطای 409
 * جواب می‌دهد و polling کار نمی‌کند. این متد بی‌ضرر و idempotent است.
 */
export async function deleteWebhook(): Promise<BaleResponse<boolean>> {
  return call<boolean>("deleteWebhook", { drop_pending_updates: false }, 15000);
}

/** دریافت آپدیت‌ها به روش long polling */
export async function getUpdates(
  offset: number,
  timeout = 25
): Promise<BaleResponse<BaleUpdate[]>> {
  return call<BaleUpdate[]>(
    "getUpdates",
    { offset, timeout, allowed_updates: ["message", "callback_query"] },
    (timeout + 15) * 1000
  );
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  keyboard?: InlineKeyboard
): Promise<BaleResponse<BaleMessage>> {
  return call<BaleMessage>("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
}

export async function sendChatAction(
  chatId: string | number,
  action = "typing"
): Promise<BaleResponse<boolean>> {
  return call<boolean>("sendChatAction", { chat_id: chatId, action }, 10000);
}

export async function answerCallback(id: string, text?: string): Promise<BaleResponse<boolean>> {
  return call<boolean>("answerCallbackQuery", { callback_query_id: id, text }, 10000);
}

/** ارسال یک عکس با file_id یا آدرس https */
export async function sendPhoto(
  chatId: string | number,
  photo: string,
  caption?: string
): Promise<BaleResponse<BaleMessage>> {
  return call<BaleMessage>("sendPhoto", { chat_id: chatId, photo, caption, parse_mode: "HTML" }, 30000);
}

export async function deleteMessage(chatId: string | number, messageId: number) {
  return call<boolean>("deleteMessage", { chat_id: chatId, message_id: messageId }, 10000);
}

export interface MediaPhoto {
  type: "photo";
  media: string; // file_id یا آدرس https
  caption?: string;
}

/** ارسال آلبوم تصاویر (۲ تا ۱۰ عکس) با file_id */
export async function sendMediaGroup(
  chatId: string | number,
  media: MediaPhoto[]
): Promise<BaleResponse<BaleMessage[]>> {
  return call<BaleMessage[]>(
    "sendMediaGroup",
    {
      chat_id: chatId,
      media: media.map((m) => ({ ...m, parse_mode: m.caption ? "HTML" : undefined })),
    },
    30000
  );
}

/** دریافت اطلاعات فایل برای دانلود (file_path لازم است) */
export async function getFile(fileId: string): Promise<BaleResponse<BaleFile>> {
  return call<BaleFile>("getFile", { file_id: fileId }, 15000);
}

/** آدرس دانلود فایل بر اساس file_path */
export function fileUrl(filePath: string): string {
  return `${BALE_API_BASE}/file/bot${botToken()}/${filePath}`;
}

/** دانلود محتوای فایل به‌صورت Buffer */
export async function downloadFile(
  fileId: string
): Promise<{ ok: boolean; buf?: Buffer; error?: string }> {
  const meta = await getFile(fileId);
  if (!meta.ok || !meta.result?.file_path) {
    return { ok: false, error: meta.description || "getFile ناموفق بود" };
  }
  try {
    const res = await fetch(fileUrl(meta.result.file_path), {
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, buf };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
