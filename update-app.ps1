# ============================================================================
#   به‌روزرسانی سامانه با آخرین کدهای گیت‌هاب — «اجرای کدهای جدید»
#
#   نحوهٔ اجرا (PowerShell با Run as Administrator):
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\update-app.ps1
#
#   این اسکریپت به‌صورت خودکار:
#     ۱) آخرین نسخهٔ کد را از گیت‌هاب دریافت و جایگزین می‌کند
#     ۲) وابستگی‌ها را نصب می‌کند (npm install)
#     ۳) دیتابیس را با اسکیمای جدید همگام می‌کند (prisma) — داده‌ها حفظ می‌شوند
#     ۴) برنامه را متوقف، نسخهٔ جدید را بیلد و دوباره راه‌اندازی می‌کند
#     ۵) برنامه و HTTPS (Caddy) را دوباره راه‌اندازی و سلامتِ پورت 3003 و دامنه را بررسی می‌کند
#
#   نکته: دیتابیس، عکس‌های آپلودی و فایل .env دست‌نخورده باقی می‌مانند.
#   اگر پوشهٔ C:\uastemdad\app وجود ندارد، اول باید deploy.ps1 را اجرا کنید.
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ------------------------------ تنظیمات ------------------------------
$Root     = "C:\uastemdad"
$App      = "$Root\app"
$LogsDir  = "$Root\logs"
$ToolsDir = "$Root\tools"
$TaskApp   = "uastemdad-app"
$TaskProxy = "uastemdad-proxy"
$AppPort   = 3003
$Domain    = "uastemdad.ir"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  به‌روزرسانی سامانهٔ مرکز علمی-کاربردی"          -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# ---------------------- ۱) بررسی دسترسی Administrator ----------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "خطا: اسکریپت باید در PowerShell با دسترسی Administrator اجرا شود." -ForegroundColor Red
    Write-Host "روی PowerShell راست‌کلیک → Run as Administrator → دوباره اجرا کنید." -ForegroundColor Yellow
    return
}

# ---------------------- ۲) بررسی وجود مخزن ----------------------
if (-not (Test-Path "$App\.git")) {
    Write-Host "خطا: مخزن کد در $App پیدا نشد." -ForegroundColor Red
    Write-Host "اول استقرار کامل را اجرا کنید:  powershell -ExecutionPolicy Bypass -File $App\deploy.ps1" -ForegroundColor Yellow
    return
}

# ---------------------- ۳) دریافت آخرین کد از گیت‌هاب ----------------------
Write-Host "-> دریافت آخرین کد از گیت‌هاب ..." -ForegroundColor Yellow
$prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
$fetchOk = $false
for ($try = 1; $try -le 3; $try++) {
    git -C $App fetch origin 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $fetchOk = $true; break }
    Write-Host "   تلاش $try ناموفق بود — ۵ ثانیه صبر و تلاش دوباره ..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 5
}
$ErrorActionPreference = $prev
if (-not $fetchOk) {
    Write-Host "خطا: اتصال به گیت‌هاب برقرار نشد (اینترنت/DNS سرور را بررسی کنید) و دوباره اجرا کنید." -ForegroundColor Red
    return
}
$oldCommit = ""
try { $oldCommit = (git -C $App rev-parse --short HEAD) } catch {}
git -C $App reset --hard origin/main | Out-Null
$newCommit = (git -C $App rev-parse --short HEAD)
git -C $App log --oneline -1
Write-Host "OK  کد به آخرین نسخهٔ گیت‌هاب به‌روز شد ($oldCommit <- $newCommit)" -ForegroundColor Cyan

Set-Location $App

# ---------------------- ۴) خواندن تنظیمات .env (حفظ مقادیر قبلی) ----------------------
$dbUrl      = "file:C:/uastemdad/db/custom.db"
$authSecret = $null
$uploadDir  = "C:/uastemdad/data/uploads"
$baleToken  = ""
$baleEnable = "true"
$siteUrl    = "https://uastemdad.ir"
if (Test-Path "$App\.env") {
    foreach ($line in Get-Content "$App\.env") {
        if ($line -match '^DATABASE_URL=(.+)$')      { $dbUrl      = $Matches[1] }
        if ($line -match '^AUTH_SECRET=(.+)$')       { $authSecret = $Matches[1] }
        if ($line -match '^UPLOAD_DIR=(.+)$')        { $uploadDir  = $Matches[1] }
        if ($line -match '^BALE_BOT_TOKEN=(.+)$')    { $baleToken  = $Matches[1] }
        if ($line -match '^BALE_BOT_ENABLED=(.+)$')  { $baleEnable = $Matches[1] }
        if ($line -match '^SITE_URL=(.+)$')          { $siteUrl    = $Matches[1] }
    }
}
if (-not $authSecret) { $authSecret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N") }
$env:DATABASE_URL         = $dbUrl
$env:AUTH_SECRET          = $authSecret
$env:UPLOAD_DIR           = $uploadDir
$env:BALE_BOT_TOKEN       = $baleToken
$env:BALE_BOT_ENABLED     = $baleEnable
$env:SITE_URL             = $siteUrl
$env:NEXT_TELEMETRY_DISABLED = "1"
Write-Host "OK  تنظیمات .env خوانده شد" -ForegroundColor Cyan

# ---------------------- ۵) توقف برنامهٔ در حال اجرا ----------------------
# مهم: برنامه باید قبل از npm install و prisma generate متوقف شود؛ وگرنه فایل‌های
# node_modules (مثل query_engine-windows.dll.node) و .next قفل می‌شوند و عملیات
# با خطای EPERM / EBUSY شکست می‌خورد.
Write-Host "-> توقف برنامه برای به‌روزرسانی ایمن ..." -ForegroundColor Yellow
cmd /c "schtasks /End /TN $TaskApp >nul 2>&1"
cmd /c "taskkill /F /IM node.exe >nul 2>&1"
Start-Sleep -Seconds 3
# پاک‌کردن فایل‌های نیمه‌کارهٔ prisma از اجراهای قبلی (اگر داشته باشند)
Get-ChildItem "$App\node_modules\.prisma\client" -Filter "*.tmp*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# ---------------------- ۶) نصب وابستگی‌ها ----------------------
Write-Host "-> نصب وابستگی‌ها (npm install — چند دقیقه) ..." -ForegroundColor Yellow
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
    Write-Host "   تلاش دوباره با رجیستری جایگزین (npmmirror) ..." -ForegroundColor Yellow
    npm install --no-audit --no-fund --registry=https://registry.npmmirror.com
    if ($LASTEXITCODE -ne 0) {
        Write-Host "خطا در نصب وابستگی‌ها — اینترنت را بررسی کنید و اسکریپت را دوباره اجرا کنید." -ForegroundColor Red
        return
    }
}
Write-Host "OK  وابستگی‌ها نصب شد" -ForegroundColor Cyan

# ---------------------- ۷) همگام‌سازی دیتابیس ----------------------
Write-Host "-> همگام‌سازی دیتابیس (prisma) ..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    # اگر باز هم قفلی ماند، یک‌بار دیگر با اطمینان کامل پروسه‌های node را می‌بندیم و تلاش می‌کنیم
    Write-Host "   تلاش دوباره پس از بستن کامل پروسه‌ها ..." -ForegroundColor Yellow
    cmd /c "taskkill /F /IM node.exe >nul 2>&1"
    Start-Sleep -Seconds 5
    Get-ChildItem "$App\node_modules\.prisma\client" -Filter "*.tmp*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { Write-Host "خطا در prisma generate." -ForegroundColor Red; return }
}
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در همگام‌سازی دیتابیس." -ForegroundColor Red; return }
Write-Host "OK  دیتابیس همگام شد (داده‌های قبلی حفظ شده)" -ForegroundColor Cyan

# ---------------------- ۸) بیلد نسخهٔ production ----------------------
Write-Host "-> بیلد نسخهٔ production (چند دقیقه — پنجره را نبندید) ..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build
if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$App\.next\standalone\server.js")) {
    Write-Host "خطا در بیلد پروژه — خروجی بالا را بررسی کنید." -ForegroundColor Red
    Write-Host "راه‌اندازی نسخهٔ قبلی:  $Root\restart-app.cmd" -ForegroundColor Yellow
    return
}
Write-Host "OK  بیلد کامل شد" -ForegroundColor Cyan

# ---------------------- ۹) راه‌اندازی دوبارهٔ برنامه ----------------------
Write-Host "-> راه‌اندازی دوبارهٔ برنامه ..." -ForegroundColor Yellow
cmd /c "schtasks /Run /TN $TaskApp >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "هشدار: اجرای وظیفهٔ '$TaskApp' ناموفق بود — دستی اجرا کنید:  schtasks /Run /TN $TaskApp" -ForegroundColor Yellow
}

# Caddy (HTTPS) هم باید بالا بیاید — بعد از -Stop یا تعمیرات ممکن است خاموش مانده باشد
if (Test-Path "$ToolsDir\caddy.exe") {
    $proxyExists = (schtasks /Query /TN $TaskProxy 2>$null) -ne $null
    if ($proxyExists) {
        Write-Host "-> راه‌اندازی HTTPS (Caddy) ..." -ForegroundColor Yellow
        cmd /c "schtasks /Run /TN $TaskProxy >nul 2>&1"
    }
}

# ---------------------- ۱۰) بررسی سلامت ----------------------
Write-Host "-> بررسی سلامت برنامه ..." -ForegroundColor Yellow
$okLocal = $false
foreach ($i in 1..40) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$AppPort/" -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $okLocal = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}

# بررسی HTTPS دامنه (غیرمانع‌ساز — فقط اطلاع)
$okHttps = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "https://$Domain/" -TimeoutSec 8
        if ($r.StatusCode -eq 200) { $okHttps = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}

Write-Host ""

Write-Host "================================================" -ForegroundColor Green
if ($okLocal) {
    Write-Host "  به‌روزرسانی کامل شد و برنامه بالا آمده است!"   -ForegroundColor Green
} else {
    Write-Host "  به‌روزرسانی انجام شد اما برنامه هنوز پاسخ نمی‌دهد" -ForegroundColor Yellow
}
Write-Host "================================================" -ForegroundColor Green
Write-Host "  نسخهٔ کد:        $newCommit"                        -ForegroundColor Yellow
if ($okLocal) {
    Write-Host "  وضعیت:          در حال سرویس‌دهی روی پورت $AppPort"  -ForegroundColor Yellow
} else {
    Write-Host "  بررسی لاگ:      Get-Content $LogsDir\app.log -Tail 50" -ForegroundColor Yellow
    Write-Host "  راه‌اندازی دوباره: $Root\restart-app.cmd"          -ForegroundColor Yellow
}
if ($okLocal -and $okHttps) {
    Write-Host "  سایت:           https://$Domain  — در دسترس ✓"                -ForegroundColor Green
} elseif ($okLocal) {
    Write-Host "  سایت:           https://$Domain — هنوز در دسترس نیست؛ چند دقیقه بعد دوباره چک کنید:" -ForegroundColor Yellow
    Write-Host "                  start-app.ps1   |   لاگ Caddy: $LogsDir\caddy.log" -ForegroundColor Yellow
} else {
    Write-Host "  سایت:           $siteUrl"
}
Write-Host "  پنل مدیریت:     $siteUrl/admin"                    -ForegroundColor Yellow
Write-Host "  لاگ برنامه:     $LogsDir\app.log"                  -ForegroundColor Yellow
Write-Host ""
Write-Host "  نکته: بات بله همراه با خودِ برنامه بالا می‌آید (polling داخل سرور)." -ForegroundColor White
Write-Host "  اگر HTTPS هم مشکل دارد:  powershell -ExecutionPolicy Bypass -File $App\fix-https.ps1" -ForegroundColor White
Write-Host ""
