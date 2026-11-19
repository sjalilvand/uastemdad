/**
 * نقطهٔ اتصال به چرخهٔ عمر سرور Next.js — هنگام بالا آمدن پروسه اجرا می‌شود.
 * از این‌جا حلقهٔ long-polling بات بله راه‌اندازی می‌شود تا مدیر بتواند
 * مستقیماً از پیام‌رسان بله خبر منتشر کند.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startPoller, isBotConfigured, botEnabled } = await import("@/lib/bale/poller");
    if (isBotConfigured() && botEnabled()) {
      // کمی تأخیر تا Prisma و بقیهٔ سرور کامل بالا بیایند
      setTimeout(() => {
        startPoller().catch((e) => console.error("[bale-bot] start failed:", e));
      }, 3000);
    }
  } catch (e) {
    console.error("[bale-bot] instrumentation register error:", e);
  }
}
