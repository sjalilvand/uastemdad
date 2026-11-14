/* اجرای نسخهٔ production سامانه روی پورت 3003
   هم‌راستا با آدرس همیشگی localhost:3003 — اگر PORT از قبل تنظیم شده باشد همان اولویت دارد.
   پیش‌نیاز: یک‌بار اجرای «npm run build» */
process.env.PORT = process.env.PORT || "3003";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
require("../.next/standalone/server.js");
