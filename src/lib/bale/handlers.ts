/**
 * ماشین حالت بات بله سامانه — ثبت خبر و اطلاعیه به‌صورت گرافیکی و گام‌به‌گام
 */
import crypto from "crypto";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { slugify } from "@/lib/admin-api";
import {
  answerCallback,
  deleteMessage,
  downloadFile,
  getMe,
  sendChatAction,
  sendMessage,
  sendMediaGroup,
  sendPhoto,
  siteUrl,
  type InlineButton,
  type InlineKeyboard,
  type BaleMessage,
  type BaleUpdate,
  type MediaPhoto,
} from "./api";
import { clip, esc, faDate, faNum, fullName, textToHtml } from "./text";
import { handleChannelPost } from "./channel";
import {
  getSession,
  logBot,
  resetSession,
  setState,
  States,
  type DraftData,
  type StateKey,
} from "./session";

// ---------------------------------------------------------------------------
// ابزارهای عمومی
// ---------------------------------------------------------------------------

const MAX_PHOTOS = 10;

function uploadsDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

function btn(text: string, callback_data: string): InlineButton {
  return { text, callback_data };
}

function urlBtn(text: string, url: string): InlineButton {
  return { text, url };
}

async function isLinked(chatId: string): Promise<boolean> {
  const admin = await db.botAdmin.findUnique({ where: { chatId } });
  return !!admin && admin.isActive;
}

/** منوی اصلی بات */
function mainKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [btn("📰 افزودن خبر جدید", "new:NEWS"), btn("📢 افزودن اطلاعیه", "new:ANNOUNCEMENT")],
      [btn("🗂 فهرست اخبار و اطلاعیه‌ها", "list:0")],
      [btn("🤖 وضعیت بات", "status"), btn("📖 راهنما", "help")],
      [btn("🌐 مشاهده سایت", siteUrl()), btn("🔗 قطع اتصال", "unlink")],
    ],
  };
}

async function sendMenu(chatId: string, text?: string) {
  await sendMessage(
    chatId,
    text ||
      `🎓 <b>پنل مدیریت محتوای بله</b>\n\nیکی از گزینه‌های زیر را انتخاب کنید:`,
    mainKeyboard()
  );
}

/** قدم‌های ویزارد برای نمایش پیشرفت */
const STEP_LABEL: Record<string, string> = {
  [States.NEWS_TITLE]: "۱ از ۵",
  [States.NEWS_EXCERPT]: "۲ از ۵",
  [States.NEWS_BODY]: "۳ از ۵",
  [States.NEWS_PHOTOS]: "۴ از ۵",
  [States.NEWS_CATEGORY]: "۵ از ۵",
};

function stepHeader(state: StateKey, type: "NEWS" | "ANNOUNCEMENT"): string {
  const kind = type === "ANNOUNCEMENT" ? "اطلاعیه" : "خبر";
  const icon = type === "ANNOUNCEMENT" ? "📢" : "📰";
  return `${icon} <b>ثبت ${kind}</b> — گام ${faNum(STEP_LABEL[state] || "")}\n━━━━━━━━━━━━━━`;
}

// ---------------------------------------------------------------------------
// ورود ادمین
// ---------------------------------------------------------------------------

async function handleLogin(chatId: string, state: StateKey, data: DraftData, text: string, msg: BaleMessage) {
  if (state === States.LOGIN_USER) {
    await setState(chatId, States.LOGIN_PASS, { ...data, loginUsername: text.trim() });
    await sendMessage(
      chatId,
      `🔑 <b>گام ۲ — گذرواژه</b>\n\nحالا گذرواژهٔ حساب «<code>${esc(text.trim())}</code>» را ارسال کنید.\n\n<i>⚠️ پس از ارسال، پیام گذرواژه را از گفتگو حذف کنید؛ بات هم تلاش می‌کند آن را خودکار حذف کند.</i>`,
      { inline_keyboard: [[btn("❌ انصراف", "st:cancel")]] }
    );
    return;
  }

  if (state === States.LOGIN_PASS) {
    const username = (data.loginUsername || "").trim();
    const user = await db.user.findFirst({ where: { username } });
    const ok = !!user && user.isActive && verifyPassword(text.trim(), user.passwordHash);
    // تلاش برای حذف پیام حاوی گذرواژه
    deleteMessage(chatId, msg.message_id).catch(() => undefined);
    if (!ok) {
      const fails = (data.failedLogins || 0) + 1;
      if (fails >= 5) {
        await resetSession(chatId);
        await sendMessage(
          chatId,
          "🚫 پنج تلاش ناموفق پشت‌سرهم. برای امنیت بیشتر، فرایند ورود از نو آغاز شد؛ چند دقیقه صبر کنید و دوباره /start را بفرستید."
        );
        return;
      }
      await setState(chatId, States.LOGIN_PASS, { ...data, failedLogins: fails });
      await sendMessage(
        chatId,
        `❌ نام کاربری یا گذرواژه اشتباه است (تلاش ${faNum(fails)} از ۵).\nلطفاً گذرواژه را دوباره ارسال کنید:`,
        { inline_keyboard: [[btn("❌ انصراف", "st:cancel")]] }
      );
      return;
    }

    await db.botAdmin.upsert({
      where: { chatId },
      create: {
        chatId,
        userId: String(msg.from?.id || ""),
        name: fullName(msg.from),
        username: msg.from?.username || "",
        isActive: true,
      },
      update: {
        name: fullName(msg.from),
        username: msg.from?.username || "",
        isActive: true,
        userId: String(msg.from?.id || ""),
      },
    });
    await resetSession(chatId);
    await logBot("LOGIN", `${user!.name} (@${username})`, chatId);
    await sendMessage(
      chatId,
      `✅ <b>خوش آمدید، ${esc(user!.name)}!</b>\n\nحساب شما با موفقیت به بات متصل شد. حالا می‌توانید مستقیماً از همین‌جا خبر و اطلاعیه منتشر کنید.`,
      mainKeyboard()
    );
    return;
  }
}

// ---------------------------------------------------------------------------
// ویزارد ثبت خبر — گام‌ها
// ---------------------------------------------------------------------------

async function askTitle(chatId: string, data: DraftData) {
  await setState(chatId, States.NEWS_TITLE, { type: data.type || "NEWS", images: [], fileIds: [] });
  await sendMessage(
    chatId,
    `${stepHeader(States.NEWS_TITLE, data.type || "NEWS")}\n\n<b>📝 گام ۱ — عنوان</b>\n\nعنوان ${data.type === "ANNOUNCEMENT" ? "اطلاعیه" : "خبر"} را بنویسید:\n\n<i>مثال: بازدید سرپرست دانشگاه از روند برگزاری مصاحبه متقاضیان تدریس</i>`,
    { inline_keyboard: [[btn("❌ انصراف", "st:cancel")]] }
  );
}

async function askExcerpt(chatId: string, data: DraftData) {
  await setState(chatId, States.NEWS_EXCERPT, data);
  await sendMessage(
    chatId,
    `${stepHeader(States.NEWS_EXCERPT, data.type || "NEWS")}\n\n<b>📄 گام ۲ — خلاصه</b>\n\nیک یا دو جملهٔ خلاصه بنویسید (در فهرست اخبار سایت نمایش داده می‌شود). اگر خالی بماند، از ابتدای متن ساخته می‌شود.`,
    { inline_keyboard: [[btn("⏭ رد کردن", "st:skip"), btn("❌ انصراف", "st:cancel")]] }
  );
}

async function askBody(chatId: string, data: DraftData) {
  await setState(chatId, States.NEWS_BODY, data);
  await sendMessage(
    chatId,
    `${stepHeader(States.NEWS_BODY, data.type || "NEWS")}\n\n<b>📰 گام ۳ — متن کامل</b>\n\nمتن کامل را بنویسید. می‌توانید چند پاراگراف بفرستید؛ هر بلوک متن به یک پاراگراف در سایت تبدیل می‌شود.\n\n<i>اگر متن بلند است، در چند پیام بفرستید و در پایان پیام «تمام» را ارسال کنید.</i>`,
    {
      inline_keyboard: [
        [btn("✅ متن همین است — ادامه", "st:bodydone")],
        [btn("❌ انصراف", "st:cancel")],
      ],
    }
  );
}

async function askPhotos(chatId: string, data: DraftData) {
  await setState(chatId, States.NEWS_PHOTOS, data);
  await sendMessage(
    chatId,
    `${stepHeader(States.NEWS_PHOTOS, data.type || "NEWS")}\n\n<b>🖼 گام ۴ — عکس‌ها</b>\n\nعکس‌های مرتبط را بفرستید (حداکثر ${faNum(MAX_PHOTOS)} عکس). اولین عکس، «تصویر شاخص» خبر در سایت می‌شود.\n\nپس از ارسال عکس‌ها، دکمهٔ «اتمام عکس‌ها» را بزنید. اگر خبر بدون عکس است مستقیم ادامه دهید.`,
    {
      inline_keyboard: [
        [btn("✅ اتمام عکس‌ها — ادامه", "st:done")],
        [btn("❌ انصراف", "st:cancel")],
      ],
    }
  );
}

async function askCategory(chatId: string, data: DraftData) {
  await setState(chatId, States.NEWS_CATEGORY, data);
  const cats = await db.category.findMany({ orderBy: { name: "asc" }, take: 12 });
  const rows: InlineButton[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    const row = [btn(`🏷 ${cats[i].name}`, `cat:${cats[i].id}`)];
    if (cats[i + 1]) row.push(btn(`🏷 ${cats[i + 1].name}`, `cat:${cats[i + 1].id}`));
    rows.push(row);
  }
  rows.push([btn("🚫 بدون دسته‌بندی", "cat:none")]);
  await sendMessage(
    chatId,
    `${stepHeader(States.NEWS_CATEGORY, data.type || "NEWS")}\n\n<b>🏷 گام ۵ — دسته‌بندی</b>\n\nدستهٔ مناسب را انتخاب کنید:`,
    { inline_keyboard: rows }
  );
}

function draftSummary(data: DraftData): string {
  const kind = data.type === "ANNOUNCEMENT" ? "اطلاعیه" : "خبر";
  const icon = data.type === "ANNOUNCEMENT" ? "📢" : "📰";
  const lines = [
    `${icon} <b>پیش‌نمایش ${kind}</b>`,
    "━━━━━━━━━━━━━━",
    `📝 <b>عنوان:</b> ${esc(clip(data.title || "", 200))}`,
  ];
  if (data.excerpt) lines.push(`📄 <b>خلاصه:</b> ${esc(clip(data.excerpt, 150))}`);
  if (data.body) lines.push(`📰 <b>متن:</b> ${faNum(clip(data.body || "", 400).length)} کاراکتر`);
  lines.push(`🖼 <b>عکس‌ها:</b> ${faNum((data.images || []).length)}`);
  lines.push(`🏷 <b>دسته:</b> ${data.categoryName ? esc(data.categoryName) : "بدون دسته"}`);
  return lines.join("\n");
}

async function askConfirm(chatId: string, data: DraftData) {
  await setState(chatId, States.NEWS_CONFIRM, data);
  // پیش‌نمایش تصویری در بله
  const ids = (data.fileIds || []).slice(0, 10);
  try {
    if (ids.length >= 2) {
      const media: MediaPhoto[] = ids.map((m, i) => ({
        type: "photo",
        media: m,
        caption: i === 0 ? `🖼 پیش‌نمایش: ${esc(clip(data.title || "", 80))}` : undefined,
      }));
      await sendMediaGroup(chatId, media);
    } else if (ids.length === 1) {
      await sendPhoto(chatId, ids[0], `🖼 پیش‌نمایش عکس شاخص`);
    }
  } catch {
    // پیش‌نمایش تصویری اختیاری است
  }
  await sendMessage(chatId, `${draftSummary(data)}\n\nمنتشر کنیم؟`, {
    inline_keyboard: [
      [btn("✅ بله — انتشار در سایت", "pub:yes")],
      [btn("💾 ذخیره به‌عنوان پیش‌نویس", "pub:draft")],
      [btn("🔄 نوشتن از نو", "pub:retry"), btn("❌ انصراف", "st:cancel")],
    ],
  });
}

// ---------------------------------------------------------------------------
// انتشار نهایی
// ---------------------------------------------------------------------------

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

async function publishDraft(chatId: string, data: DraftData, publish: boolean) {
  const title = (data.title || "").trim();
  if (!title) {
    await sendMessage(chatId, "⚠️ عنوان خالی است؛ لطفاً از نو شروع کنید.", mainKeyboard());
    await resetSession(chatId);
    return;
  }
  const images = data.images || [];
  const excerpt =
    (data.excerpt || "").trim() ||
    clip((data.body || "").replace(/\s+/g, " ").trim(), 160);
  const post = await db.post.create({
    data: {
      title,
      slug: await uniqueSlug(title),
      excerpt,
      content: textToHtml(data.body || ""),
      coverImage: images[0] || null,
      images: JSON.stringify(images),
      source: "BALE",
      type: data.type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "NEWS",
      published: publish,
      publishedAt: new Date(),
      categoryId: data.categoryId || null,
    },
  });
  await resetSession(chatId);
  await logBot(publish ? "PUBLISH" : "DRAFT", title, chatId);

  const kind = data.type === "ANNOUNCEMENT" ? "اطلاعیه" : "خبر";
  const pathSegment = data.type === "ANNOUNCEMENT" ? "announcements" : "news";
  if (publish) {
    await sendMessage(
      chatId,
      `🎉 <b>${kind} با موفقیت در سایت منتشر شد!</b>\n\n📝 ${esc(title)}\n🗓 ${faDate(post.publishedAt)}\n\nمستقیماً برای اعضای سایت نمایش داده می‌شود.`,
      {
        inline_keyboard: [
          [urlBtn("🌐 مشاهده در سایت", `${siteUrl()}/${pathSegment}/${encodeURIComponent(post.slug)}`)],
          [btn("📰 ثبت خبر بعدی", "new:NEWS"), btn("🏠 منوی اصلی", "menu")],
        ],
      }
    );
  } else {
    await sendMessage(
      chatId,
      `💾 <b>${kind} به‌عنوان پیش‌نویس ذخیره شد.</b>\n\n📝 ${esc(title)}\n\nبرای انتشار، از پنل مدیریت سایت بخش «اخبار و اطلاعیه‌ها» وضعیت آن را به «منتشر شده» تغییر دهید.`,
      { inline_keyboard: [[btn("📰 ثبت خبر بعدی", "new:NEWS"), btn("🏠 منوی اصلی", "menu")]] }
    );
  }
}

// ---------------------------------------------------------------------------
// دریافت عکس از ادمین
// ---------------------------------------------------------------------------

async function saveIncomingPhoto(chatId: string, data: DraftData, fileId: string, sizeBytes?: number) {
  if ((data.images || []).length >= MAX_PHOTOS) {
    await sendMessage(chatId, `⚠️ سقف ${faNum(MAX_PHOTOS)} عکس پر شده است؛ دکمهٔ «اتمام عکس‌ها» را بزنید.`);
    return;
  }
  if (sizeBytes && sizeBytes > 10 * 1024 * 1024) {
    await sendMessage(chatId, "⚠️ حجم عکس بیش از ۱۰ مگابایت است؛ عکس کوچک‌تری بفرستید.");
    return;
  }
  await sendChatAction(chatId, "upload_photo");
  const dl = await downloadFile(fileId);
  if (!dl.ok || !dl.buf) {
    await sendMessage(chatId, `⚠️ دریافت عکس ناموفق بود: ${esc(dl.error || "")}\nیک بار دیگر تلاش کنید.`);
    return;
  }
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const name = `bot-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.jpg`;
  await writeFile(path.join(dir, name), dl.buf);
  const url = `/uploads/${name}`;
  const images = [...(data.images || []), url];
  const fileIds = [...(data.fileIds || []), fileId];
  await setState(chatId, States.NEWS_PHOTOS, { ...data, images, fileIds });
  await sendMessage(
    chatId,
    `✅ عکس ${faNum(images.length)} ذخیره شد${images.length === 1 ? " (تصویر شاخص خبر)" : ""}.\nعکس بعدی را بفرستید یا ادامه دهید.`,
    {
      inline_keyboard: [
        [btn("✅ اتمام عکس‌ها — ادامه", "st:done")],
        [btn("❌ انصراف", "st:cancel")],
      ],
    }
  );
}

// ---------------------------------------------------------------------------
// پردازش پیام‌های متنی
// ---------------------------------------------------------------------------

function stripCommand(text: string): string {
  return text.replace(/^\/([a-zA-Z0-9_]+)(@\w+)?\s*$/, "$1").trim().toLowerCase();
}

async function handleText(chatId: string, state: StateKey, data: DraftData, msg: BaleMessage) {
  const raw = (msg.text || "").trim();
  const cmd = stripCommand(raw);

  // دستورهای سراسری
  if (cmd === "start" || cmd === "menu") return handleStart(chatId, msg);
  if (cmd === "cancel") {
    await resetSession(chatId);
    await sendMessage(chatId, "🚫 عملیات لغو شد.", mainKeyboard());
    return;
  }
  if (cmd === "help") return handleHelp(chatId);
  if (cmd === "status") return handleStatus(chatId);

  // راهنمای اتصال کانال: یک پست از کانال را به گفتگوی بات فوروارد کنید تا شناسه را نشان دهد
  if (msg.forward_from_chat?.type === "channel") {
    const fc = msg.forward_from_chat;
    await sendMessage(
      chatId,
      `📡 این پیام از کانال «${esc(fc.title || fc.username || "")}» فوروارد شده است.\n\n` +
        `<b>شناسهٔ کانال:</b> <code>${esc(String(fc.id || ""))}</code>` +
        (fc.username ? ` یا <code>@${esc(fc.username)}</code>` : "") +
        `\n\nراه‌اندازی انتشار خودکار پست‌های کانال در سایت:\n` +
        `۱) بات را در کانال به‌عنوان مدیر (Admin) اضافه کنید.\n` +
        `۲) شناسهٔ بالا را در پنل مدیریت ← بخش بات ← «شناسهٔ کانال» ذخیره کنید.\n` +
        `۳) از این به بعد هر پست کانال به‌صورت خبر یا اطلاعیه در سایت منتشر می‌شود (متن با «اطلاعیه» یا 📢 = اطلاعیه).`,
      mainKeyboard()
    );
    return;
  }

  switch (state) {
    case States.NEWS_TITLE: {
      if (!raw || raw.length < 3) {
        await sendMessage(chatId, "⚠️ عنوان کوتاه است؛ لطفاً یک عنوان معنادار بنویسید.");
        return;
      }
      await askExcerpt(chatId, { ...data, title: clip(raw, 200) });
      return;
    }
    case States.NEWS_EXCERPT: {
      await askBody(chatId, { ...data, excerpt: clip(raw, 300) });
      return;
    }
    case States.NEWS_BODY: {
      const body = clip(raw, 15000);
      await askPhotos(chatId, { ...data, body: data.body ? `${data.body}\n${body}` : body });
      return;
    }
    case States.NEWS_PHOTOS: {
      if (raw.includes("تمام") || raw.toLowerCase() === "done") {
        await askCategory(chatId, data);
        return;
      }
      await sendMessage(chatId, "🖼 لطفاً عکس بفرستید یا از دکمه‌ها استفاده کنید:", {
        inline_keyboard: [
          [btn("✅ اتمام عکس‌ها — ادامه", "st:done")],
          [btn("❌ انصراف", "st:cancel")],
        ],
      });
      return;
    }
    case States.NEWS_CONFIRM:
    case States.NEWS_CATEGORY: {
      await sendMessage(chatId, "لطفاً از دکمه‌های زیر پیام قبلی استفاده کنید:", mainKeyboard());
      return;
    }
    default: {
      await sendMenu(
        chatId,
        `سلام ${esc(fullName(msg.from))} 👋\n\nبرای ثبت ${"خبر یا اطلاعیه"} از منوی زیر استفاده کنید:`
      );
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// پردازش پیام و کال‌بک
// ---------------------------------------------------------------------------

async function handleStart(chatId: string, msg: BaleMessage) {
  if (await isLinked(chatId)) {
    await resetSession(chatId);
    await sendMenu(
      chatId,
      `🎓 <b>سامانهٔ دانشگاه جامع علمی‌کاربردی</b>\n\nسلام ${esc(fullName(msg.from))} عزیز 👋\n\nاز این‌جا می‌توانید بدون ورود به پنل، خبر و اطلاعیه را با عکس منتشر کنید. یکی از گزینه‌های زیر را انتخاب کنید:`
    );
    return;
  }
  await setState(chatId, States.LOGIN_USER, {});
  await sendMessage(
    chatId,
    `🎓 <b>پنل مدیریت محتوای بله</b>\n\nاین بات برای انتشار خبر و اطلاعیه در سایت <b>مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره)</b> است.\n\n🔐 برای شروع، <b>نام کاربری</b> حساب مدیریت را ارسال کنید:`,
    { inline_keyboard: [[btn("❌ انصراف", "st:cancel")]] }
  );
}

async function handleHelp(chatId: string) {
  await sendMessage(
    chatId,
    `📖 <b>راهنمای بات</b>\n\n` +
      `۱) «📰 افزودن خبر جدید» را بزنید.\n` +
      `۲) عنوان ← خلاصه ← متن کامل را مرحله‌به‌مرحله بفرستید.\n` +
      `۳) عکس‌ها را مستقیم در همین گفتگو ارسال کنید (اولین عکس، تصویر شاخص می‌شود).\n` +
      `۴) دسته‌بندی را انتخاب و «انتشار در سایت» را بزنید.\n\n` +
      `🌍 خبر منتشرشده فوراً در صفحهٔ اخبار سایت نمایش داده می‌شود و پیش‌نویس‌ها از پنل مدیریت قابل انتشاراند.\n\n` +
      `⚡️ دستورهای میان‌بر: /menu منوی اصلی • /cancel لغو عملیات • /help راهنما • /status وضعیت`,
    mainKeyboard()
  );
}

async function handleStatus(chatId: string) {
  const [total, newsCount, annCount, drafts, admins, me] = await Promise.all([
    db.post.count(),
    db.post.count({ where: { type: "NEWS", published: true } }),
    db.post.count({ where: { type: "ANNOUNCEMENT", published: true } }),
    db.post.count({ where: { published: false } }),
    db.botAdmin.count({ where: { isActive: true } }),
    getMe(),
  ]);
  const last = await db.post.findFirst({ where: { source: "BALE" }, orderBy: { createdAt: "desc" } });
  const botName = me.ok && me.result ? esc(me.result.first_name || "بات") : "بات سامانه";
  const lines = [
    `🤖 <b>وضعیت بات</b>`,
    "━━━━━━━━━━━━━━",
    `🪪 بات: ${botName}${me.ok && me.result?.username ? ` (<code>@${esc(me.result.username)}</code>)` : ""}`,
    `🔗 اتصال شما: <b>فعال</b> (${faNum(admins)} مدیر متصل)`,
    `📰 اخبار منتشرشده: ${faNum(newsCount)}`,
    `📢 اطلاعیه‌های منتشرشده: ${faNum(annCount)}`,
    `💾 پیش‌نویس‌ها: ${faNum(drafts)}`,
    `🗂 کل رکوردها: ${faNum(total)}`,
  ];
  if (last) lines.push(`\n🕘 آخرین ثبت از بله: «${esc(clip(last.title, 60))}» — ${faDate(last.createdAt)}`);
  await sendMessage(chatId, lines.join("\n"), mainKeyboard());
}

async function handleList(chatId: string, page: number) {
  const perPage = 8;
  const [total, items] = await Promise.all([
    db.post.count(),
    db.post.findMany({
      orderBy: { publishedAt: "desc" },
      skip: page * perPage,
      take: perPage,
      select: { id: true, title: true, slug: true, type: true, published: true, publishedAt: true },
    }),
  ]);
  if (total === 0) {
    await sendMessage(chatId, "هنوز خبری ثبت نشده است.", mainKeyboard());
    return;
  }
  const rows: InlineButton[][] = items.map((p) => {
    const kind = p.type === "ANNOUNCEMENT" ? "📢" : "📰";
    const flag = p.published ? "" : " 💤";
    const seg = p.type === "ANNOUNCEMENT" ? "announcements" : "news";
    return [
      { text: `${kind}${flag} ${clip(p.title, 34)}`, url: `${siteUrl()}/${seg}/${encodeURIComponent(p.slug)}` },
      { text: "🗑", callback_data: `del:${p.id}` },
    ];
  });
  const nav: InlineButton[] = [];
  if (page > 0) nav.push(btn("◀️ قبلی", `list:${page - 1}`));
  if ((page + 1) * perPage < total) nav.push(btn("بعدی ▶️", `list:${page + 1}`));
  if (nav.length) rows.push(nav);
  rows.push([btn("🏠 منوی اصلی", "menu")]);
  await sendMessage(
    chatId,
    `🗂 <b>فهرست (${faNum(page * perPage + 1)}–${faNum(page * perPage + items.length)} از ${faNum(total)})</b>\n\nبرای حذف روی 🗑 بزنید؛ برای مشاهده روی عنوان بزنید.`,
    { inline_keyboard: rows }
  );
}

export async function handleCallback(update: BaleUpdate) {
  const cb = update.callback_query;
  if (!cb || !cb.data) return;
  const chatId = String(cb.message?.chat?.id || cb.from.id);
  const data = cb.data;

  const answer = (text?: string) => answerCallback(cb.id, text).catch(() => undefined);

  if (!(await isLinked(chatId))) {
    await answer("ابتدا وارد شوید: /start");
    return;
  }

  const { state, data: draft } = await getSession(chatId);

  // منو و ناوبری
  if (data === "menu") {
    await answer();
    await resetSession(chatId);
    await sendMenu(chatId);
    return;
  }
  if (data === "help") {
    await answer();
    await handleHelp(chatId);
    return;
  }
  if (data === "status") {
    await answer("در حال دریافت…");
    await handleStatus(chatId);
    return;
  }
  if (data === "unlink") {
    await answer();
    await sendMessage(chatId, "🔗 اتصال این گفتگو به پنل قطع شود؟", {
      inline_keyboard: [[btn("✅ بله، قطع کن", "unlinkok"), btn("🚫 نه", "menu")]],
    });
    return;
  }
  if (data === "unlinkok") {
    await answer();
    await db.botAdmin.updateMany({ where: { chatId }, data: { isActive: false } });
    await resetSession(chatId);
    await logBot("UNLINK", "قطع اتصال", chatId);
    await sendMessage(chatId, "✅ اتصال قطع شد. برای ورود دوباره /start را بفرستید.");
    return;
  }

  // شروع ویزارد
  if (data.startsWith("new:")) {
    const type = data.split(":")[1] === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "NEWS";
    await answer();
    await resetSession(chatId);
    await askTitle(chatId, { type, images: [], fileIds: [] });
    return;
  }

  // گام‌های ویزارد
  if (data === "st:skip") {
    await answer();
    if (state === States.NEWS_EXCERPT) await askBody(chatId, { ...draft, excerpt: "" });
    else await sendMenu(chatId);
    return;
  }
  if (data === "st:bodydone") {
    await answer();
    if (state === States.NEWS_BODY) await askPhotos(chatId, draft);
    else await sendMenu(chatId);
    return;
  }
  if (data === "st:done") {
    await answer();
    if (state === States.NEWS_PHOTOS) await askCategory(chatId, draft);
    else await sendMenu(chatId);
    return;
  }
  if (data === "st:cancel") {
    await answer();
    await resetSession(chatId);
    await sendMessage(chatId, "🚫 عملیات لغو شد.", mainKeyboard());
    return;
  }

  if (data.startsWith("cat:")) {
    const val = data.split(":")[1];
    await answer();
    if (state !== States.NEWS_CATEGORY) {
      await sendMenu(chatId);
      return;
    }
    if (val === "none") {
      await askConfirm(chatId, { ...draft, categoryId: null, categoryName: "" });
    } else {
      const cat = await db.category.findUnique({ where: { id: val } });
      if (!cat) {
        await sendMessage(chatId, "⚠️ دسته یافت نشد؛ دوباره انتخاب کنید.");
        await askCategory(chatId, draft);
        return;
      }
      await askConfirm(chatId, { ...draft, categoryId: cat.id, categoryName: cat.name });
    }
    return;
  }

  if (data.startsWith("pub:")) {
    const action = data.split(":")[1];
    if (state !== States.NEWS_CONFIRM) {
      await answer("این پیش‌نویس منقضی شده است");
      await sendMenu(chatId);
      return;
    }
    if (action === "yes") {
      await answer("در حال انتشار…");
      await publishDraft(chatId, draft, true);
    } else if (action === "draft") {
      await answer("ذخیرهٔ پیش‌نویس…");
      await publishDraft(chatId, draft, false);
    } else if (action === "retry") {
      await answer();
      await askTitle(chatId, { type: draft.type || "NEWS", images: [], fileIds: [] });
    } else {
      await answer();
      await resetSession(chatId);
      await sendMessage(chatId, "🚫 عملیات لغو شد.", mainKeyboard());
    }
    return;
  }

  // فهرست و حذف
  if (data.startsWith("list:")) {
    await answer();
    await handleList(chatId, Math.max(0, Number(data.split(":")[1]) || 0));
    return;
  }
  if (data.startsWith("del:")) {
    await answer();
    const id = data.slice(4);
    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      await sendMessage(chatId, "⚠️ این خبر قبلاً حذف شده است.");
      return;
    }
    await sendMessage(
      chatId,
      `🗑 <b>حذف شود؟</b>\n\n📝 ${esc(post.title)}\n🗓 ${faDate(post.publishedAt)}`,
      {
        inline_keyboard: [
          [btn("🗑 بله، حذف کن", `delok:${post.id}`), btn("🚫 نه", "list:0")],
        ],
      }
    );
    return;
  }
  if (data.startsWith("delok:")) {
    const id = data.slice(6);
    const post = await db.post.delete({ where: { id } }).catch(() => null);
    await answer(post ? "حذف شد" : "یافت نشد");
    await logBot("DELETE", post?.title || id, chatId);
    await handleList(chatId, 0);
    return;
  }

  await answer();
}

export async function handleMessage(update: BaleUpdate) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;
  const chatId = String(msg.chat.id);
  const { state, data } = await getSession(chatId);

  // عکس یا تصویر به‌صورت فایل
  const isPhotoStep = state === States.NEWS_PHOTOS;
  if (msg.photo?.length) {
    if (!isPhotoStep) {
      if (await isLinked(chatId)) {
        await sendMessage(chatId, "🖼 برای پیوست عکس به خبر، ابتدا از منو «افزودن خبر جدید» را انتخاب کنید:", mainKeyboard());
      }
      return;
    }
    if (!(await isLinked(chatId))) return;
    const best = msg.photo[msg.photo.length - 1];
    await saveIncomingPhoto(chatId, data, best.file_id, best.file_size);
    return;
  }
  if (msg.document && msg.document.mime_type?.startsWith("image/")) {
    if (!isPhotoStep) return;
    if (!(await isLinked(chatId))) return;
    await saveIncomingPhoto(chatId, data, msg.document.file_id, msg.document.file_size);
    return;
  }

  if (!msg.text) return;

  if (!(await isLinked(chatId))) {
    if (state === States.LOGIN_USER || state === States.LOGIN_PASS) {
      await handleLogin(chatId, state, data, msg.text, msg);
      return;
    }
    if (stripCommand(msg.text) === "start") {
      await handleStart(chatId, msg);
      return;
    }
    await sendMessage(chatId, "🔒 دسترسی محدود است. برای ورود، دستور /start را بفرستید.");
    return;
  }

  await handleText(chatId, state, data, msg);
}

/** ورودی اصلی poller */
export async function processUpdate(update: BaleUpdate): Promise<void> {
  try {
    if (update.callback_query) await handleCallback(update);
    else if (update.channel_post) await handleChannelPost(update.channel_post);
    else if (update.message || update.edited_message) await handleMessage(update);
  } catch (e) {
    console.error("[bale-bot] processUpdate error:", e);
    await logBot("ERROR", e instanceof Error ? e.message : String(e));
  }
}
