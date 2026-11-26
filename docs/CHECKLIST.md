# چک‌لیست عیب‌یابی سریع «سایت بالا نمی‌آید»

> نسخهٔ متنی همین چک‌لیست در سند Word «راهنمای عملیات، پایش و عیب‌یابی سامانه» هم هست.
> همهٔ دستورها در PowerShell با دسترسی Administrator اجرا شوند.

## گام ۰ — آیا واقعاً دان است؟
- با مرورگر گوشی (اینترنت موبایل، نه Wi-Fi اداره) این آدرس را باز کنید:
  `https://uastemdad.ir/api/health`
- پاسخ JSON (`{"ok":true,...}`) دیدید؟ سایت از بیرون سالم است؛ مشکل احتمالاً از شبکهٔ داخلی شما یا مرورگر است. متوقف شوید.
- پاسخ نداد؟ به گام ۱ بروید.

## گام ۱ — وضعیت کلی سامانه
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\start-app.ps1 -Status
```
- وظایف `uastemdad-app` و `uastemdad-proxy`، پورت‌ها، سلامت برنامه و HTTPS و ۵ خط آخر لاگ را یک‌جا نشان می‌دهد.

## گام ۲ — لاگ برنامه
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\read-log.ps1 -Errors
```
(معادل دستی: `Get-Content C:\uastemdad\logs\app.log -Tail 50`)
- خطاهای قرمز (`EADDRINUSE`، `database is locked`، `EPERM`) معمولاً علت را همان‌جا نشان می‌دهند.
- راه‌حل خطاهای رایج: بخش «خطاهای رایج» در `docs/RUNBOOK.md`.

## گام ۳ — اشغال پورت 3003
```powershell
netstat -ano | findstr :3003
```
- خط `LISTENING` = پروسه‌ای روی پورت نشسته. بدون خط = برنامه اصلاً اجرا نیست.

## گام ۴ — وظایف زمان‌بندی
```powershell
schtasks /Query /TN uastemdad-app /FO LIST
schtasks /Query /TN uastemdad-proxy /FO LIST
schtasks /Query /TN uastemdad-monitor /FO LIST
```
- وضعیت باید `Running` باشد؛ `Ready` یا خطای شروع = وظیفه اجرا نشده.

## گام ۵ — ری‌استارت استاندارد (بیشتر موارد همین را حل می‌کند)
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\start-app.ps1 -Restart
```
- ۲ تا ۳ دقیقه صبر کنید؛ پیام سبز بات بله = تأیید سلامت از دید خود برنامه.

## گام ۶ — اگر فقط HTTPS مشکل دارد (پورت 3003 سالم است)
```powershell
Get-Content C:\uastemdad\logs\caddy.log -Tail 30
C:\uastemdad\restart-caddy.cmd
```
- در صورت تکرار:
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\fix-https.ps1
```
- چک کنید پورت‌های 80 و 443 در فایروال سرور و فایروال دیتاسنتر باز باشند.

## گام ۷ — دیتابیس و فضای دیسک
- وجود فایل `C:\uastemdad\db\custom.db` را چک کنید.
```powershell
Get-PSDrive C
```
- فضای خالی کمتر از ۲ گیگابایت خطرناک است؛ لاگ‌ها و بکاپ‌های قدیمی را پاک کنید.

## گام ۸ — بیلد نسخهٔ تولید
```powershell
cd C:\uastemdad\app
npm run build
```
- اگر بیلد خطا داد، خروجی را ذخیره کنید؛ تا رفع مشکل `C:\uastemdad\restart-app.cmd` نسخهٔ قبلی را بالا می‌آورد.

## گام ۹ — زمان بوت ویندوز
```powershell
systeminfo | findstr "System Boot Time"
```
- اگر زمان بوت هم‌زمان با شروع قطعی است، سرور ری‌استارت شده و وظایف ONSTART باید برنامه را خودکار بالا آورده باشند؛ گام ۴ را دوباره چک کنید. اگر وظایف وجود ندارند: `deploy.ps1` و سپس `install-monitor.ps1`.

## گام ۱۰ — آزمایش سامانهٔ پایش
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\scripts\monitor-app.ps1 -Test
```
- وضعیت برنامه/HTTPS/وظایف/دیسک + پیام آزمایشی بات.

---

## جدول علامت ← علت محتمل ← اقدام

| علامت | علت محتمل | اقدام |
| --- | --- | --- |
| سایت برای همه دان، `/api/health` هم پاسخ نمی‌دهد | کرش پروسه یا توقف وظیفهٔ app | `start-app.ps1 -Restart` سپس گام ۲ |
| فقط HTTPS دان، پورت 3003 سالم | توقف Caddy / گواهی / پورت 80 و 443 | `restart-caddy.cmd`، سپس `fix-https.ps1` |
| خطای 500 یا صفحهٔ سفید | خطای کد یا دیتابیس پس از به‌روزرسانی | گام ۲؛ در صورت نیاز `prisma db push` و `npm run build` |
| سایت سالم ولی بات بله پاسخ نمی‌دهد | توکن تنظیم نیست یا 409 دو نمونه | `set-bot-token.ps1`؛ لاگ `[bale-bot]` |
| بعد از به‌روزرسانی بالا نمی‌آید | بیلد ناقص / فایل قفل‌شده | اجرای دوبارهٔ `update-app.ps1`؛ در شکست `restart-app.cmd` |
| بعد از ری‌استارت ویندوز بالا نیامده | وظایف زمان‌بندی ساخته/فعال نیستند | گام ۴؛ در صورت نبود، `deploy.ps1` + `install-monitor.ps1` |
| `EADDRINUSE:3003` | دو پروسهٔ node روی یک پورت | `taskkill /F /IM node.exe` سپس `start-app.ps1` |
| پیام زرد «فضای دیسک کم است» | انباشت لاگ/بکاپ/عکس | پاک‌سازی `C:\uastemdad\logs` و بکاپ‌های قدیمی |
| `database is locked` | چند پروسه روی SQLite یا قفل آنتی‌ویروس | ری‌استارت؛ فقط یک وظیفهٔ app؛ مسیر db در مستثنیات آنتی‌ویروس |
| پیام‌های مکرر «بالا آمد» | کرش تکراری پروسه (معمولاً حافظه) | گام ۲؛ ری‌استارت کامل سرور در ساعات کم‌ترافیک |
