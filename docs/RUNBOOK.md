# راهنمای عملیات، پایش و عیب‌یابی سامانه (RUNBOOK)

دامنه: https://uastemdad.ir — سرور: ویندوز 94.182.131.94 — برنامه: Next.js پورت 3003 + Caddy (HTTPS) + بات بله
نسخهٔ Word این راهنما: `uastemdad-runbook.docx` (دریافتی از تیم توسعه). این فایل همیشه همراه کد به‌روز می‌شود.

---

## ۱. سامانهٔ پایش — چه چیزی اضافه شده و چطور کار می‌کند

| جزء | محل | وظیفه |
| --- | --- | --- |
| `/api/health` | درون برنامه | پاسخ JSON با وضعیت دیتابیس/حافظه/بات؛ دیتابیس خراب = کد 503 |
| مانیتور داخلی (`src/lib/monitor.ts`) | درون برنامه، هر ۶۰ ثانیه | ضربان در دیتابیس، گزارش «بالا آمد + مدت قطعی» به مدیران بات، هشدار حافظه/دیسک |
| پایشگر بیرونی (`scripts/monitor-app.ps1`) | `C:\uastemdad\app\scripts` | چک هر دقیقه، ری‌استارت خودکار تا ۳ بار، پیام «دان است»، ری‌استارت Caddy، هشدار دیسک |
| وظیفهٔ زمان‌بندی `uastemdad-monitor` | Task Scheduler (SYSTEM) | اجرای پایشگر هر ۱ دقیقه، حتی بدون ورود کاربر |

- **قفل نگهداری**: حین اجرای `update-app.ps1` یا پس از `start-app.ps1 -Stop`، فایل `logs\maintenance.lock` ساخته می‌شود و پایشگر تا ۲۰ دقیقه دخالت نمی‌کند. راه‌اندازی بعدی با `start-app.ps1` یا پایان به‌روزرسانی، قفل را برمی‌دارد.
- **پیام‌های «بالا آمد»** بدون تنظیم اضافه به همهٔ مدیرانِ بات می‌رسد. پیام‌های هشدارِ پایشگر بیرونی («دان است»، HTTPS، دیسک) فقط با تنظیم `MONITOR_CHAT_ID` ارسال می‌شوند.

### نصب پایش (یک‌بار)
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\update-app.ps1
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\install-monitor.ps1
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\scripts\monitor-app.ps1 -Test
```

### تنظیم شناسهٔ پیام هشدار (MONITOR_CHAT_ID)
1. در بات بله دستور `/status` بزنید → خط «شناسهٔ گفتگوی شما» را کپی کنید.
2. اجرا:
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\set-monitor-chat.ps1 -ChatId 123456789
```
3. پیام آزمایشی در بله باید برسد.

### معنای پیام‌های بات

| پیام | معنا | اقدام |
| --- | --- | --- |
| سبز «سامانه بالا آمد (ری‌استارت سریع)» | قطعی کمتر از ۲ دقیقه | هیچ |
| سبز «سامانه دوباره بالا آمد + مدت خارج از سرویس» | قطعی واقعی، رفع شده | اگر مکرر شد: CHECKLIST.md |
| قرمز «دیتابیس پاسخ نمی‌دهد» | SQLite در دسترس نیست | `start-app.ps1 -Restart`؛ تکرار = گام ۷ چک‌لیست |
| قرمز «سامانه دان است؛ راه‌اندازی خودکار ناموفق بود» | ۳ تلاش خودکار شکست خورده | اقدام دستی — چک‌لیست؛ متن پیام شامل ۱۵ خط آخر لاگ است |
| نارنجی «مشکل HTTPS خودکار رفع شد» | Caddy ری‌استارت شد | هیچ |
| نارنجی «برنامه سالم است اما HTTPS در دسترس نیست» | Caddy/گواهی/فایروال | `fix-https.ps1` |
| زرد «حافظهٔ پروسه بالا است» | حافظه > ~۱٫۴ گیگابایت | ری‌استارت در ساعات کم‌ترافیک |
| زرد «فضای دیسک کم است» | زیر ۲ گیگابایت | پاک‌سازی لاگ‌ها؛ دیسکِ پر دیتابیس را خراب می‌کند |

لاگ پایش: `C:\uastemdad\logs\monitor.log` — وضعیت لحظه‌ای: `logs\monitor-state.json`

---

## ۲. دستورهای پایهٔ روزمره

| اسکریپت | کاربرد |
| --- | --- |
| `start-app.ps1` | بالا آوردن برنامه + HTTPS + نمایش وضعیت |
| `start-app.ps1 -Restart` | توقف کامل و راه‌اندازی دوباره (نخستین اقدام در قطعی) |
| `start-app.ps1 -Stop` | توقف عمدی (پایشگر هم تا راه‌اندازی بعدی غیرفعال است) |
| `start-app.ps1 -Status` | فقط وضعیت، بدون تغییر |
| `update-app.ps1` | دریافت کد جدید + نصب + دیتابیس + بیلد + راه‌اندازی |
| `fix-https.ps1` | اصلاح فایروال و فعال‌سازی مجدد HTTPS |
| `install-monitor.ps1` | نصب وظیفهٔ پایش هر ۱ دقیقه |
| `monitor-app.ps1 -Test` | وضعیت پایش + پیام آزمایشی بات |
| `monitor-app.ps1 -NoRestart` | فقط هشدار، بدون ری‌استارت (عیب‌یابی) |
| `read-log.ps1` | خواندن لاگ برنامه با فیلتر (به‌جای Get-Content دستی) |
| `read-log.ps1 -Errors` | فقط خطاهای اخیر (قرمز) از app.log |
| `read-log.ps1 -Log caddy` | لاگ HTTPS (Caddy) |
| `read-log.ps1 -Log monitor` | لاگ پایشگر |
| `read-log.ps1 -Log all` | ۱۵ خط آخر هر سهٔ لاگ، یک‌جا |
| `read-log.ps1 -Find "EADDRINUSE"` | جستجوی یک کلمه در لاگ |
| `read-log.ps1 -Follow` | نمایش زندهٔ لاگ |

الگوی اجرا:
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\<اسکریپت>
```

### ری‌استارت استاندارد
```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\start-app.ps1 -Restart
```
۲–۳ دقیقه طول می‌کشد؛ در پایان جدول وضعیت نمایش داده می‌شود و پیام سبز بات می‌رسد.

### اگر ری‌استارت جواب نداد (توالی ۵ مرحله‌ای)
```powershell
Get-Content C:\uastemdad\logs\app.log -Tail 50          # ۱) علت را بخوان
taskkill /F /IM node.exe                                 # ۲) همهٔ node ها را ببند
C:\uastemdad\restart-app.cmd                             # ۳) اجرای دوباره
powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\start-app.ps1 -Status   # ۴) بررسی
powershell -ExecutionPolicy Bypass -File C:\uastemdad\deploy.ps1                  # ۵) مرحلهٔ آخر (داده‌ها حفظ می‌شوند)
```

### پس از ری‌استارت ویندوز
وظایف `uastemdad-app` و `uastemdad-proxy` نوع ONSTART دارند (بالا آمدن خودکار بدون ورود کاربر) و پایشگر هم ۱ دقیقه بعد فعال می‌شود. اگر بالا نیامد: `-Status` → وضعیت وظایف → اجرای دستی `start-app.ps1` → اگر وظایف نبودند: `deploy.ps1` + `install-monitor.ps1`.

### به‌روزرسانی امن
- فقط با `update-app.ps1`؛ پنجره را نبندید. قفل نگهداری خودکار نوشته می‌شود.
- قبل از آن بکاپ بگیرید (بخش بعد).
- اگر بیلد شکست خورد: `restart-app.cmd` نسخهٔ قبلی را بالا می‌آورد.

### بکاپ دوره‌ای
```powershell
robocopy C:\uastemdad\db D:\backup\db-%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2% custom.db /R:2 /W:5
robocopy C:\uastemdad\data\uploads D:\backup\uploads /E /R:2 /W:5 /MAXAGE:30
```
حداقل هفتگی + همیشه قبل از update. چند نسخهٔ اخیر را نگه دارید؛ ترجیحاً روی فضای دیگری هم کپی کنید.

---

## ۳. خطاهای رایج

| خطا | معنا | راه‌حل |
| --- | --- | --- |
| `EADDRINUSE :::3003` | پورت اشغال | `taskkill /F /IM node.exe` + `start-app.ps1` |
| `EPERM/EBUSY` هنگام npm/بیلد | فایل قفل برنامهٔ در حال اجرا | بستن node و اجرای دوبارهٔ update-app |
| `database is locked` | قفل SQLite / آنتی‌ویروس | ری‌استارت؛ db در مستثنیات آنتی‌ویروس |
| `getUpdates failed: 409` | دو نمونهٔ بات / وب‌هوک قدیمی | فقط یک وظیفهٔ app؛ پاک‌سازی وب‌هوک خودکار است |
| `BALE_BOT_TOKEN=MISSING` | توکن بات تنظیم نیست | `set-bot-token.ps1` |
| خطای Prisma engine dll | موتور دیتابیس قفل/ناقص | بستن node و `npx prisma generate` |
| خطای certificate در caddy.log | پورت 80 مسدود / ساعت سرور | باز بودن 80 و 443؛ همگام‌سازی ساعت؛ `fix-https.ps1` |
| npm install شکست | اینترنت/DNS | update-app سه بار تلاش + آینهٔ جایگزین دارد |
| پاسخ 502 از دامنه ولی 3003 سالم | برنامه دان است | `start-app.ps1 -Restart` |

---

## ۴. نگهداری دوره‌ای

| دوره | اقدام |
| --- | --- |
| روزانه | مرور پیام‌های بات (پیام زرد/قرمز = اقدام طبق جدول پیام‌ها) |
| هفتگی | `start-app.ps1 -Status` + `Get-PSDrive C` (بیش از ۵ گیگ آزاد) + بکاپ + چک اندازهٔ لاگ‌ها |
| ماهانه | `update-app.ps1` در ساعات کم‌ترافیک + ری‌استارت کامل سرور در ساعات آرام + `monitor-app.ps1 -Test` |

---

## ۵. مسیرهای مهم

| مسیر | توضیح |
| --- | --- |
| `C:\uastemdad\app` | کد برنامه |
| `C:\uastemdad\app\.env` | توکن بات، MONITOR_CHAT_ID، SITE_URL |
| `C:\uastemdad\db\custom.db` | دیتابیس SQLite — مهم‌ترین فایل؛ بکاپ هفتگی |
| `C:\uastemdad\data\uploads` | فایل‌های آپلودی |
| `C:\uastemdad\logs\app.log` / `caddy.log` / `monitor.log` | لاگ برنامه / HTTPS / پایش |
| `C:\uastemdad\logs\monitor-state.json` | وضعیت لحظه‌ای پایشگر |
| `C:\uastemdad\logs\maintenance.lock` | قفل نگهداری (حین update یا توقف عمدی) |
| `C:\uastemdad\tools\caddy.exe` | وب‌سرور HTTPS |
| `C:\uastemdad\run-app.cmd` / `run-caddy.cmd` | فرمان اجرای وظایف |
| `C:\uastemdad\restart-app.cmd` / `restart-caddy.cmd` | ری‌استارت سریع هر بخش |

دنبال‌کردن زندهٔ لاگ:
```powershell
Get-Content C:\uastemdad\logs\app.log -Wait -Tail 30
```
