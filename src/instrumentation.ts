/**
 * نقطهٔ اتصال به چرخهٔ عمر سرور Next.js — هنگام بالا آمدن پروسه اجرا می‌شود.
 * از این‌جا حلقهٔ long-polling بات بله راه‌اندازی می‌شود تا مدیر بتواند
 * مستقیماً از پیام‌رسان بله خبر منتشر کند.
 *
 * ⚠️ نکتهٔ مهم: به‌دلیل باگ شناخته‌شدهٔ Next.js در حالت output:"standalone"
 * (register() هرگز صدا زده نمی‌شود — github.com/vercel/next.js/issues/68740)،
 * اسکریپت scripts/start-3003.js خودش این فایل کامپایل‌شده را require و
 * register() را دستی صدا می‌زند. این فایل برای سازگاری با next dev / next start
 * و نسخه‌های آینده حفظ شده است (فراخوانی تکراری امن است — startPoller قفل دارد).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startPoller, isBotConfigured, botEnabled } = await import("@/lib/bale/poller");
    if (!isBotConfigured()) {
      console.error("[bale-bot] BALE_BOT_TOKEN تنظیم نشده است — بات خاموش ماند (فایل .env یا run-app.cmd را چک کنید)");
      return;
    }
    if (!botEnabled()) {
      console.error("[bale-bot] BALE_BOT_ENABLED=false است — بات خاموش ماند");
      return;
    }
    // کمی تأخیر تا Prisma و بقیهٔ سرور کامل بالا بیایند
    setTimeout(() => {
      startPoller().catch((e) => console.error("[bale-bot] start failed:", e));
    }, 3000);
  } catch (e) {
    console.error("[bale-bot] instrumentation register error:", e);
  }
}
