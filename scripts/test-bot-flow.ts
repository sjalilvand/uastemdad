/**
 * تست شبیه‌سازی مکالمهٔ بات بله — کل جریان «ثبت خبر» را بدون چت واقعی اجرا می‌کند.
 * اجرا:  npx tsx scripts/test-bot-flow.ts
 */
import { db } from "@/lib/db";
import { processUpdate } from "@/lib/bale/handlers";
import { getSession, States } from "@/lib/bale/session";

const CHAT = "9990001";

function msgUpdate(text: string) {
  return {
    update_id: Math.floor(Math.random() * 1e9),
    message: {
      message_id: Math.floor(Math.random() * 1e5),
      chat: { id: Number(CHAT), type: "private", first_name: "تست" },
      from: { id: 888, first_name: "مدیر", last_name: "آزمون", username: "tester" },
      text,
    },
  } as const;
}

function cbUpdate(data: string) {
  return {
    update_id: Math.floor(Math.random() * 1e9),
    callback_query: {
      id: `cb${Math.floor(Math.random() * 1e6)}`,
      from: { id: 888, first_name: "مدیر" },
      data,
      message: {
        message_id: 1,
        chat: { id: Number(CHAT), type: "private", first_name: "تست" },
      },
    },
  } as const;
}

async function state() {
  const s = await getSession(CHAT);
  return `${s.state}`;
}

async function expect(label: string, actual: string, wanted: string) {
  const ok = actual === wanted;
  console.log(`${ok ? "✅" : "❌"} ${label}: ${actual}${ok ? "" : ` (انتظار: ${wanted})`}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  // پاک‌سازی اولیه
  await db.botSession.deleteMany({ where: { chatId: CHAT } });
  await db.botAdmin.deleteMany({ where: { chatId: CHAT } });

  console.log("— شروع جریان ورود —");
  await processUpdate(msgUpdate("/start") as never);
  await expect("پس از /start", await state(), States.LOGIN_USER);

  await processUpdate(msgUpdate("admin") as never);
  await expect("پس از نام کاربری", await state(), States.LOGIN_PASS);

  await processUpdate(msgUpdate("admin123") as never);
  await expect("پس از گذرواژهٔ درست", await state(), States.IDLE);
  const linked = await db.botAdmin.findUnique({ where: { chatId: CHAT } });
  console.log(`${linked && linked.isActive ? "✅" : "❌"} ادمین متصل شد: ${linked?.name} | چت: ${linked?.chatId}`);
  if (!linked?.isActive) process.exitCode = 1;

  console.log("— شروع ویزارد خبر —");
  await processUpdate(cbUpdate("new:NEWS") as never);
  await expect("پس از افزودن خبر", await state(), States.NEWS_TITLE);

  await processUpdate(msgUpdate("بازدید آزمایشی سرپرست دانشگاه از مرکز") as never);
  await expect("پس از عنوان", await state(), States.NEWS_EXCERPT);

  await processUpdate(cbUpdate("st:skip") as never);
  await expect("پس از رد کردن خلاصه", await state(), States.NEWS_BODY);

  await processUpdate(
    msgUpdate("این متن آزمایشی خبر است.\n\nپاراگراف دوم برای بررسی تبدیل به HTML.") as never
  );
  await expect("پس از متن کامل", await state(), States.NEWS_PHOTOS);

  await processUpdate(cbUpdate("st:done") as never);
  await expect("پس از اتمام عکس‌ها", await state(), States.NEWS_CATEGORY);

  await processUpdate(cbUpdate("cat:none") as never);
  await expect("پس از انتخاب دسته", await state(), States.NEWS_CONFIRM);

  console.log("— انتشار —");
  await processUpdate(cbUpdate("pub:yes") as never);
  await expect("پس از انتشار", await state(), States.IDLE);

  const post = await db.post.findFirst({
    where: { title: "بازدید آزمایشی سرپرست دانشگاه از مرکز" },
    orderBy: { createdAt: "desc" },
  });
  if (!post) {
    console.log("❌ خبر ساخته نشد");
    process.exitCode = 1;
  } else {
    console.log(`✅ خبر ساخته شد: slug=${post.slug} | published=${post.published} | source=${post.source}`);
    console.log(`   content HTML: ${post.content.slice(0, 120)}...`);
    console.log(`   images: ${post.images}`);
    if (post.source !== "BALE" || !post.published) process.exitCode = 1;
  }

  const logs = await db.botLog.findMany({ where: { chatId: CHAT }, orderBy: { createdAt: "asc" } });
  console.log(`— گزارش فعالیت: ${logs.map((l) => l.action).join(" → ")}`);

  // حذف خبر آزمایشی و داده‌های تست
  if (post) await db.post.delete({ where: { id: post.id } });
  await db.botSession.deleteMany({ where: { chatId: CHAT } });
  await db.botAdmin.deleteMany({ where: { chatId: CHAT } });
  console.log("— داده‌های آزمایشی پاک شد —");
  await db.$disconnect();
}

main().catch((e) => {
  console.error("خطای تست:", e);
  process.exitCode = 1;
});
