import { db } from "@/lib/db";

/** وضعیت‌های ماشین حالت بات */
export const States = {
  IDLE: "IDLE",
  LOGIN_USER: "LOGIN_USER",
  LOGIN_PASS: "LOGIN_PASS",
  NEWS_TITLE: "NEWS_TITLE",
  NEWS_EXCERPT: "NEWS_EXCERPT",
  NEWS_BODY: "NEWS_BODY",
  NEWS_PHOTOS: "NEWS_PHOTOS",
  NEWS_CATEGORY: "NEWS_CATEGORY",
  NEWS_CONFIRM: "NEWS_CONFIRM",
  DELETE_SELECT: "DELETE_SELECT",
} as const;

export type StateKey = (typeof States)[keyof typeof States];

/** دادهٔ پیش‌نویس خبر در طول ویزارد */
export interface DraftData {
  type?: "NEWS" | "ANNOUNCEMENT";
  title?: string;
  excerpt?: string;
  body?: string;
  images?: string[]; // آدرس‌های ذخیره‌شده در سایت (/uploads/...)
  fileIds?: string[]; // file_id عکس‌ها برای پیش‌نمایش در بله
  categoryId?: string | null;
  categoryName?: string;
  loginUsername?: string;
  failedLogins?: number;
  lastMsgId?: number;
}

export interface Session {
  state: StateKey;
  data: DraftData;
}

export async function getSession(chatId: string): Promise<Session> {
  const row = await db.botSession.findUnique({ where: { chatId } });
  if (!row) return { state: States.IDLE, data: {} };
  let data: DraftData = {};
  try {
    data = JSON.parse(row.data || "{}") as DraftData;
  } catch {
    data = {};
  }
  return { state: (row.state as StateKey) || States.IDLE, data };
}

export async function setState(chatId: string, state: StateKey, data?: DraftData) {
  const current = data === undefined ? await getSession(chatId) : null;
  const payload = data ?? current!.data;
  await db.botSession.upsert({
    where: { chatId },
    create: { chatId, state, data: JSON.stringify(payload) },
    update: { state, data: JSON.stringify(payload) },
  });
}

export async function resetSession(chatId: string) {
  await db.botSession.upsert({
    where: { chatId },
    create: { chatId, state: States.IDLE, data: "{}" },
    update: { state: States.IDLE, data: "{}" },
  });
}

export async function logBot(action: string, detail = "", chatId: string | number = "") {
  try {
    await db.botLog.create({
      data: { action, detail: String(detail).slice(0, 500), chatId: String(chatId) },
    });
  } catch {
    // لاگ نباید جریان اصلی را بشکند
  }
}
