# استقرار سامانه روی سرور ویندوز (دامنهٔ uastemdad.ir)

این سند نحوهٔ بالا آوردن سامانه روی سرور واقعی **94.182.131.94** با دامنه
**https://uastemdad.ir** و HTTPS را شرح می‌دهد.

## روش سریع — اسکریپت خودکار deploy.ps1 (توصیه‌شده)

فایل **`deploy.ps1`** در ریشهٔ پروژه، همهٔ کارها را خودکار انجام می‌دهد:

- اصلاح خودکار DNS سرور اگر گیت‌هاب باز نشود (سرویس‌های شکن، الکترو، 403، رادار، گوگل)
- نصب Git و Node.js در صورت نبود — از منبع اصلی + آینه‌های جایگزین (npmmirror، Huawei، TUNA)
- دریافت کد از گیت‌هاب در `C:\uastemdad\app` و به‌روزرسانی در اجراهای بعدی
- نصب وابستگی‌ها، ساخت دیتابیس SQLite، داده‌های اولیه و بیلد production
- اجرای برنامه و Caddy به‌صورت «وظیفهٔ زمان‌بندی» ویندوز: استارت خودکار پس از
  ری‌استارت سرور و اجرای دوبارهٔ خودکار پس از هر خطا
- باز کردن فایروال (پورت‌های 80، 443 و 3003)
- HTTPS خودکار دامنه با گواهی رایگان Let's Encrypt

### اجرا — فقط این یک دستور را کپی و در PowerShell اجرا کنید

**PowerShell را با Run as Administrator باز کنید** و این دستور را یک‌جا Paste کنید:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; foreach($a in (Get-NetAdapter | ? Status -eq 'Up')) { netsh interface ip set dns name="$($a.Name)" source=static addr=178.22.122.100 validate=no; netsh interface ip add dns name="$($a.Name)" addr=185.51.200.2 index=2 validate=no; netsh interface ip add dns name="$($a.Name)" addr=8.8.8.8 index=3 validate=no }; ipconfig /flushdns; New-Item -ItemType Directory -Force -Path C:\uastemdad | Out-Null; try { Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/sjalilvand/uastemdad/main/deploy.ps1' -OutFile C:\uastemdad\deploy.ps1 } catch { try { Invoke-WebRequest -UseBasicParsing 'https://cdn.jsdelivr.net/gh/sjalilvand/uastemdad@main/deploy.ps1' -OutFile C:\uastemdad\deploy.ps1 } catch { Add-Content "$env:SystemRoot\System32\drivers\etc\hosts" "`n140.82.121.4 github.com"; Add-Content "$env:SystemRoot\System32\drivers\etc\hosts" "140.82.121.6 api.github.com"; Add-Content "$env:SystemRoot\System32\drivers\etc\hosts" "185.199.108.133 raw.githubusercontent.com"; ipconfig /flushdns | Out-Null; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/sjalilvand/uastemdad/main/deploy.ps1' -OutFile C:\uastemdad\deploy.ps1 } }; powershell -ExecutionPolicy Bypass -File C:\uastemdad\deploy.ps1
```

این دستور اول DNS سرور را تنظیم می‌کند (**validate=no** مهم است — بدون آن ویندوز
دستور ست‌کردن DNS را با خطای «The configured DNS server is incorrect or does not
exist» رد می‌کند)، بعد اسکریپت استقرار را از گیت‌هاب می‌گیرد — به‌ترتیب از سه مسیر:
`raw.githubusercontent.com` → آینهٔ `jsDelivr` → اگر هر دو باز نشد، با نوشتن IPهای
گیت‌هاب در فایل `hosts`.

اسکریپتِ دریافت‌شده هم در ابتدای اجرا، سلامت DNS را خودش بررسی و در صورت لزوم
اصلاح می‌کند؛ پس حتی بدون مرحلهٔ اول هم معمولاً جواب می‌دهد.

پیش‌نیازهای بیرونی:
- رکورد **A** دامنهٔ `uastemdad.ir` → `94.182.131.94` (در پنل دامنه)
- پورت‌های **80** و **443** در شبکه به این سرور باز باشند

### نتیجه

| مورد | مقدار |
|---|---|
| سایت | https://uastemdad.ir |
| دسترسی موقت (تا تنظیم‌شدن DNS دامنه) | http://94.182.131.94:3003 |
| پنل مدیریت | https://uastemdad.ir/admin — کاربر `admin` / گذرواژهٔ `admin123` (بعد از ورود تغییر دهید) |
| پوشهٔ کد | `C:\uastemdad\app` |
| دیتابیس | `C:\uastemdad\db\custom.db` (SQLite) |
| فایل‌های آپلودی | `C:\uastemdad\data\uploads` |
| لاگ‌ها | `C:\uastemdad\logs\app.log` و `caddy.log` |
| وظایف ویندوز | `uastemdad-app` و `uastemdad-proxy` (استارت خودکار پس از ری‌استارت) |
| گواهی HTTPS | Let's Encrypt — خودکار توسط Caddy تمدید می‌شود |

### به‌روزرسانی نسخه‌های بعدی

همین `deploy.ps1` را دوباره اجرا کنید — کد به آخرین نسخهٔ گیت‌هاب به‌روز می‌شود و
داده‌ها (اخبار، تنظیمات، آپلودها، دیتابیس) حفظ می‌شوند.

---

## عیب‌یابی DNS سرور (پیام‌های could not be resolved / configured DNS server is incorrect)

اگر روی سرور این پیام‌ها را می‌بینید:

```
Invoke-WebRequest : The remote name could not be resolved: 'raw.githubusercontent.com'
The configured DNS server is incorrect or does not exist.
There are no Domain Name Servers (DNS) configured on this computer.
```

معنی‌اش این است که سرور اصلاً DNS کارکردی ندارد (خیلی رایج در سرورهای مجازی
ایرانی — تنظیمات شبکهٔ اولیه بدون DNS تحویل داده می‌شود) یا DNS آن گیت‌هاب را
باز نمی‌کند. سه نکته:

**۱) در netsh حتماً `validate=no` باشد.** بدون آن ویندوز می‌خواهد سرور DNS را
اول امتحان کند و چون به آن نمی‌رسد، کل دستور را رد می‌کند و DNS ست نمی‌شود:

```powershell
foreach($a in (Get-NetAdapter | ? Status -eq 'Up')) {
  netsh interface ip set dns name="$($a.Name)" source=static addr=178.22.122.100 validate=no
  netsh interface ip add dns name="$($a.Name)" addr=185.51.200.2 index=2 validate=no
  netsh interface ip add dns name="$($a.Name)" addr=8.8.8.8 index=3 validate=no
}
ipconfig /flushdns
```

سرویس‌های جایگزین اگر شکن جواب نداد: الکترو `78.157.42.100` و `78.157.42.101`،
رادار `10.202.10.10` و `10.202.10.11`، گوگل `8.8.8.8`.

**۲) اگر حتی با DNS ست‌شده هم چیزی باز نشد** (یعنی مرکز داده خروجی پورت 53 را
مسدود کرده)، نیازی به کار دستی نیست: نسخهٔ جدید `deploy.ps1` خودش از
DNS-over-HTTPS استفاده می‌کند (روی پورت 443) و نتیجه را در فایل `hosts` می‌نویسد
و آخرین لایه، IPهای ثابت گیت‌هاب/npm را در `hosts` می‌گذارد.

**۳) دانلود دستی اسکریپت:** اگر هیچ‌کدام جواب نداد، فایل `deploy.ps1` را روی
خود سیستم دانلود و با RDP به سرور کپی کنید، سپس:

```powershell
powershell -ExecutionPolicy Bypass -File C:\uastemdad\deploy.ps1
```

خود `deploy.ps1` هم در قدم اول همهٔ این لایه‌ها را به‌طور خودکار اجرا می‌کند
و برای دانلود Git/Node از آینه‌های جایگزین استفاده می‌کند.

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
- **ری‌استارت برنامه:** `C:\uastemdad\restart-app.cmd` را اجرا کنید
  (یا: `schtasks /End /TN uastemdad-app` سپس `schtasks /Run /TN uastemdad-app`)
- **ری‌استارت HTTPS/Caddy:** `C:\uastemdad\restart-caddy.cmd`
- **استارت خودکار پس از ری‌استارت سرور:** وظایف `uastemdad-app` و
  `uastemdad-proxy` با `ONSTART` ساخته شده‌اند؛ نیازی به کار اضافه نیست.
- **سایت بالا نمی‌آید؟** لاگ `C:\uastemdad\logs\app.log` و `caddy.log` را
  ببینید؛ مطمئن شوید پورت‌های 80/443 آزاد و رکورد A دامنه به IP سرور اشاره می‌کند.
- **امنیت توکن گیت‌هاب:** توکن در هیچ فایلی ذخیره نمی‌شود؛ توکن‌هایی که در
  گفتگو استفاده شده را پس از استقرار از حساب گیت‌هاب بچرخانید
  (Settings → Developer settings → Tokens).
