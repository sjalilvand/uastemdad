/* اجرای نسخهٔ production سامانه روی پورت 3003
   ─────────────────────────────────────────
   ۱) فایل .env پوشهٔ برنامه را می‌خواند (منبع حقیقت تنظیمات) — حتی اگر run-app.cmd قدیمی باشد
   ۲) سرور Next نسخهٔ standalone را اجرا می‌کند
   ۳) بات بله را روشن می‌کند: به‌دلیل باگ شناخته‌شدهٔ Next.js در حالت standalone
      (register() هرگز صدا زده نمی‌شود — github.com/vercel/next.js/issues/68740)،
      هوک instrumentation را مستقیم require و register() را دستی صدا می‌زنیم.
   پیش‌نیاز: یک‌بار اجرای «npm run build» */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

// ---------- ۱) بارگذاری .env (بدون وابستگی خارجی) ----------
let envCount = 0;
try {
  const raw = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (key.startsWith("#")) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[key] = v;
    envCount++;
  }
} catch (_) {
  /* اگر .env نبود، متغیرهای محیطی (run-app.cmd) ملاک هستند */
}

process.env.PORT = process.env.PORT || "3003";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.NEXT_RUNTIME = "nodejs";

// گزارش وضعیت ورودی‌های حیاتی — مقدار توکن هرگز چاپ نمی‌شود
console.log(
  `[start-3003] port=${process.env.PORT} | .env vars=${envCount} | ` +
    `BALE_BOT_TOKEN=${process.env.BALE_BOT_TOKEN ? "set ✓" : "MISSING ✗"} | ` +
    `BALE_BOT_ENABLED=${process.env.BALE_BOT_ENABLED || "true"} | ` +
    `DATABASE_URL=${process.env.DATABASE_URL ? "set ✓" : "MISSING ✗"}`
);

// ---------- ۲) اجرای سرور Next ----------
require("../.next/standalone/server.js");

// ---------- ۳) روشن‌کردن بات بله ----------
try {
  const inst = require("../.next/standalone/.next/server/instrumentation.js");
  const register = inst && (inst.register || (inst.default && inst.default.register));
  if (typeof register === "function") {
    Promise.resolve(register()).catch((e) =>
      console.error("[start-3003] instrumentation register failed:", e)
    );
    console.log("[start-3003] بات بله: register() invoked — polling در لاگ با [bale-bot] مشخص می‌شود");
  } else {
    console.error("[start-3003] register() در instrumentation پیدا نشد — بات بالا نمی‌آید (لاگ را به پشتیبانی بفرستید)");
  }
} catch (e) {
  console.error("[start-3003] بارگذاری instrumentation ناموفق:", e && e.message);
}
