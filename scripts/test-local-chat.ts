// تست موتور پاسخ محلی چت — شبیه‌سازی در دسترس نبودن سرویس هوش مصنوعی
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:../db/custom.db";

const questions = [
  "آدرس و تلفن مرکز چیست؟",
  "آخرین اخبار مرکز را بگو",
  "چگونه ثبت نام کنم؟",
  "ساعات کاری مرکز چگونه است؟",
  "دوره مدیریت امور خیریه چیست؟",
  "هوا چطور است؟",
];

async function main() {
  const { localAnswer } = await import("../src/lib/chat-local");
  const { db } = await import("../src/lib/db");

  for (const q of questions) {
    const reply = await localAnswer(q, "fa");
    console.log("\n❓", q);
    console.log("   →", reply.slice(0, 220).replace(/\n/g, " | "));
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
