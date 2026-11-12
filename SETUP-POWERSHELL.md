# راه‌اندازی سامانه با PowerShell (ویندوز)

این سند مراحل نصب، پیکربندی و اجرای کامل سامانه «مرکز آموزش علمی–کاربردی کمیته امداد» روی پورت **3003** در ویندوز را شرح می‌دهد.

---

## ۱. پیش‌نیازها

| نرم‌افزار | نسخه | منبع |
|---|---|---|
| Node.js | ۲۰ یا جدیدتر | https://nodejs.org |
| Git | آخرین نسخه | https://git-scm.com |
| (اختیاری) Bun | آخرین نسخه | https://bun.sh — سرعت بالاتر |

بررسی نصب بودن در PowerShell:

```powershell
node --version
git --version
```

---

## ۲. دریافت سورس از GitHub

```powershell
cd C:\
git clone https://github.com/sjalilvand/uastemdad.git
cd uastemdad
```

> اگر مخزن خصوصی است، ابتدا با توکن شخصی خود وارد شوید:
> ```powershell
> git clone https://<TOKEN>@github.com/sjalilvand/uastemdad.git
> ```

---

## ۳. نصب خودکار (روش پیشنهادی — یک دستور)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

این اسکریپت به‌صورت خودکار:
1. نصب بودن Node.js را بررسی می‌کند
2. وابستگی‌ها را نصب می‌کند (`npm install`)
3. فایل `.env` را می‌سازد
4. دیتابیس SQLite را می‌سازد (`prisma db push`)
5. داده‌های اولیه (اخبار، صفحات، منوها، ادمین، عضو نمونه) را درج می‌کند
6. سامانه را روی **پورت 3003** اجرا می‌کند

---

## ۴. نصب دستی (گام‌به‌گام)

### ۴-۱) نصب وابستگی‌ها

```powershell
npm install
```

### ۴-۲) ساخت فایل متغیرهای محیطی

```powershell
@"
DATABASE_URL=file:../db/custom.db
AUTH_SECRET=uastemdad-secret-please-change-in-production
"@ | Out-File -FilePath ".env" -Encoding utf8
```

### ۴-۳) ساخت دیتابیس و همگام‌سازی جداول

```powershell
New-Item -ItemType Directory -Force -Path "db" | Out-Null
npx prisma db push --accept-data-loss
```

### ۴-۴) درج داده‌های اولیه

```powershell
npx tsx prisma/seed.ts
```

### ۴-۵) اجرا روی پورت 3003

```powershell
npm run dev:3003
```

سامانه اکنون روی آدرس **http://localhost:3003** در دسترس است.

---

## ۵. اجرای نسخه Production (اختیاری)

```powershell
npm run build
$env:PORT = "3003"
npm start
```

---

## ۶. اطلاعات ورود پیش‌فرض

| نقش | آدرس | نام کاربری | گذرواژه |
|---|---|---|---|
| مدیر سامانه | `/admin` | `admin` | `admin123` |
| عضو نمونه (تأییدشده) | `/membership` | `0921123456` | `member1234` |

> **مهم:** پس از اولین ورود، گذرواژه مدیر را از مسیر «پنل مدیریت ← کاربران» تغییر دهید و مقدار `AUTH_SECRET` را در `.env` به یک مقدار تصادفی تغییر دهید.

---

## ۷. عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| `npm install` خطای دسترسی می‌دهد | PowerShell را «Run as Administrator» باز کنید |
| پورت 3003 اشغال است | `npm run dev` (پورت 3000) یا مسدودکننده پورت را ببندید: `netstat -ano \| findstr :3003` |
| خطای اتصال دیتابیس | مطمئن شوید پوشه `db` کنار پروژه وجود دارد و `.env` مقدار `DATABASE_URL=file:../db/custom.db` را دارد |
| خطای seed | یک‌بار `npx prisma db push` را تکرار کنید و دوباره seed بگیرید |
| فونت فارسی نمایش داده نمی‌شود | فونت وزیرمتن از خود سایت بارگذاری می‌شود؛ کش مرورگر را پاک کنید |

---

## ۸. سرویس در شبکه داخلی (اختیاری)

برای دسترسی سایر رایانه‌های شبکه به سامانه:

```powershell
npx next dev -p 3003 -H 0.0.0.0
```

سپس از سایر دستگاه‌ها با آدرس `http://<IP-ویندوز>:3003` وارد شوید.
