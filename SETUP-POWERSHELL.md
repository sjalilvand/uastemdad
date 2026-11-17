# استقرار سامانه روی سرور ویندوز (دامنهٔ uastemdad.ir)

این سند نحوهٔ بالا آوردن سامانه روی سرور واقعی با دامنه و HTTPS را شرح می‌دهد.

## روش سریع — اسکریپت خودکار deploy.ps1 (توصیه‌شده)

فایل **`deploy.ps1`** در ریشهٔ پروژه، همهٔ کارها را خودکار انجام می‌دهد:
نصب Git و Node.js (در صورت نبود)، دریافت کد از گیت‌هاب، نصب وابستگی‌ها،
ساخت دیتابیس، بیلد production، نصب دو سرویس ویندوزی (برنامه + HTTPS با Caddy
و گواهی رایگان Let's Encrypt)، باز کردن فایروال و بررسی سلامت.

### اجرا

1. روی سرور ویندوزی، **PowerShell را با Run as Administrator** باز کنید.
2. کل محتوای `deploy.ps1` را کپی و در پنجره Paste کنید (یا فایل را روی سرور
   ذخیره و اجرا کنید: `powershell -ExecutionPolicy Bypass -File C:\deploy.ps1`).
3. پیش‌نیازهای بیرونی:
   - رکورد **A** دامنهٔ `uastemdad.ir` → `94.182.131.94` (در پنل دامنه)
   - پورت‌های **80** و **443** در شبکه به این سرور باز باشند

### نتیجه

| مورد | مقدار |
|---|---|
| سایت | https://uastemdad.ir |
| پنل مدیریت | https://uastemdad.ir/admin — کاربر `admin` / گذرواژهٔ `admin123` (بعد از ورود تغییر دهید) |
| پوشهٔ برنامه | `C:\uastemdad` |
| سرویس برنامه | `uastemdad-app` (استارت خودکار پس از ری‌استارت سرور) |
| سرویس HTTPS | `uastemdad-proxy` (Caddy — گواهی خودکار) |
| لاگ‌ها | `C:\uastemdad\logs\app.log` و `caddy.log` |
| دیتابیس | `C:\uastemdad\db\custom.db` (SQLite) |
| فایل‌های آپلودی | `C:\uastemdad\data\uploads` |

### به‌روزرسانی نسخه‌های بعدی

همین `deploy.ps1` را دوباره اجرا کنید — کد به آخرین نسخهٔ گیت‌هاب به‌روز می‌شود و
داده‌ها (اخبار، تنظیمات، آپلودها) حفظ می‌شوند.

---

## روش دستی (محیط توسعه / تست روی خود سیستم)

برای اجرای محیط توسعه روی پورت 3003:

```powershell
git clone https://github.com/sjalilvand/uastemdad.git
cd uastemdad
npm install
npx prisma db push --accept-data-loss ; npx tsx prisma/seed.ts
npm run dev:3003
```

سایت: `http://localhost:3003` — پنل: `http://localhost:3003/admin`

> **نکتهٔ ارتقا در نصب قبلی:** پس از `git pull` فقط سه دستور زیر کافی است؛
> داده‌ها حفظ می‌شود و بخش‌های جدید خودکار اضافه می‌شوند:
>
> ```powershell
> npm install
> npx prisma db push --accept-data-loss ; npx tsx prisma/seed.ts
> npm run build   (فقط برای نسخهٔ production)
> ```

---

## پرسش‌های رایج

- **تغییر آدرس نقشه، تلفن‌ها، لوگو و…:** از پنل مدیریت → تنظیمات؛ همهٔ
  تنظیمات سایت (شامل آدرس روی نقشهٔ صفحهٔ اول و تماس با ما) از همان‌جا
  اعمال می‌شود.
- **ری‌استارت سرویس‌ها:** `Restart-Service uastemdad-app` یا `Restart-Service uastemdad-proxy`
- **حذف کامل:** `C:\uastemdad\tools\nssm.exe remove uastemdad-app confirm` و همین‌طور برای `uastemdad-proxy`
- **سایت بالا نمی‌آید؟** لاگ `C:\uastemdad\logs\app-err.log` را ببینید؛
  مطمئن شوید پورت‌های 80/443 آزاد و رکورد DNS درست است.
