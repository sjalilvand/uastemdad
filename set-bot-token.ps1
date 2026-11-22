# ============================================================================
#   تنظیم توکن بات بله — اعتبارسنجی، ذخیره در .env، ری‌استارت و تأیید نهایی
#
#   نحوهٔ اجرا (PowerShell با دسترسی Administrator):
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\set-bot-token.ps1
#   یا با توکن مستقیم:
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\set-bot-token.ps1 -Token "1234567890:AAAA..."
#
#   این اسکریپت خودکار:
#     ۱) توکن را می‌گیرد (اگر داده نشده باشد، می‌پرسد — Paste کنید و Enter بزنید)
#     ۲) معتبر بودن آن را با getMe از سرورهای بله چک می‌کند
#     ۳) آن را در فایل .env کنار کد برنامه ذخیره می‌کند (سایر تنظیمات دست‌نخورده می‌مانند)
#     ۴) برنامه را ری‌استارت و سلامتِ پورت 3003 را بررسی می‌کند
#     ۵) لاگ برنامه را چک می‌کند و وضعیت polling بات را نشان می‌دهد
#
#   هر وقت لاگ گفت «BALE_BOT_TOKEN=MISSING ✗» فقط همین اسکریپت را اجرا کنید.
# ============================================================================

param(
    [string]$Token = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ------------------------------ تنظیمات ------------------------------
$Root    = "C:\uastemdad"
$App     = "$Root\app"
$LogsDir = "$Root\logs"
$TaskApp = "uastemdad-app"
$EnvFile = "$App\.env"
$AppPort = 3003

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  تنظیم توکن بات بله"                              -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# ---------------------- ۱) بررسی دسترسی Administrator ----------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "خطا: اسکریپت باید در PowerShell با دسترسی Administrator اجرا شود." -ForegroundColor Red
    Write-Host "روی PowerShell راست‌کلیک ← Run as Administrator ← دوباره اجرا کنید." -ForegroundColor Yellow
    return
}
if (-not (Test-Path "$App\.git")) {
    Write-Host "خطا: مخزن کد در $App پیدا نشد — اول باید deploy.ps1 را اجرا کنید." -ForegroundColor Red
    return
}

# ---------------------- ۲) دریافت توکن ----------------------
if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "توکن بات را Paste کنید و Enter بزنید." -ForegroundColor Yellow
    Write-Host "(توکن را موقع ساختن بات از BotFather بله گرفته‌اید؛ شبیه این است: 1234567890:AAAA...)" -ForegroundColor Yellow
    $Token = (Read-Host "توکن بات").Trim()
}
$Token = $Token.Trim().Trim('"').Trim("'")
if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "خطا: توکن خالی است — چیزی ذخیره نشد." -ForegroundColor Red
    return
}
if ($Token -notmatch '^\d{6,}:[A-Za-z0-9_-]{20,}$') {
    if (-not $Force) {
        Write-Host "خطا: شکل توکن درست نیست. توکن بله معمولاً شبیه «1234567890:AAAA…» است." -ForegroundColor Red
        Write-Host "اگر مطمئن هستید توکن درست است، با پارامتر -Force دوباره اجرا کنید." -ForegroundColor Yellow
        return
    }
    Write-Host "هشدار: شکل توکن غیرمعمول است — به‌خاطر -Force ادامه می‌دهیم." -ForegroundColor Yellow
}

# ---------------------- ۳) اعتبارسنجی توکن با getMe ----------------------
Write-Host "-> بررسی معتبر بودن توکن از سرورهای بله ..." -ForegroundColor Yellow
$me = $null
try { $me = Invoke-RestMethod -Method Post -Uri "https://tapi.bale.ai/bot$Token/getMe" -TimeoutSec 20 } catch {}
if (-not ($me -and $me.ok)) {
    $desc = ""
    if ($me -and $me.description) { $desc = " (دلیل: $($me.description))" }
    Write-Host "خطا: توکن از سمت بله پذیرفته نشد$desc" -ForegroundColor Red
    Write-Host "هیچ تغییری ذخیره نشد. توکن را از گفتگوی BotFather بله دوباره بگیرید و تکرار کنید." -ForegroundColor Yellow
    Write-Host "اگر سرور به tapi.bale.ai دسترسی ندارد ولی توکن را مطمئن هستید، با -Force اجرا کنید." -ForegroundColor Yellow
    return
}
$botName = ""
if ($me.result -and $me.result.username) { $botName = $me.result.username }
if (-not $botName) { $botName = $me.result.first_name }
Write-Host "OK  توکن معتبر است — بات: @$botName" -ForegroundColor Cyan

# ---------------------- ۴) ذخیره در .env (بدون دست‌زدن به بقیهٔ تنظیمات) ----------------------
$lines = @()
if (Test-Path $EnvFile) { $lines = @(Get-Content $EnvFile) }
$lines = @($lines | Where-Object { $_ -notmatch '^\s*(BALE_BOT_TOKEN|BALE_BOT_ENABLED)\s*=' })
$lines += "BALE_BOT_TOKEN=$Token"
$lines += "BALE_BOT_ENABLED=true"
if (-not ($lines | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' })) {
    $lines = @("DATABASE_URL=file:C:/uastemdad/db/custom.db") + $lines
}
if (-not ($lines | Where-Object { $_ -match '^\s*SITE_URL\s*=' })) {
    $lines += "SITE_URL=https://uastemdad.ir"
}
# مهم: بدون BOM ذخیره می‌شود؛ پارسر .env سطر اولِ BOM‌دار را نمی‌شناسد
[System.IO.File]::WriteAllLines($EnvFile, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "OK  توکن در $EnvFile ذخیره شد (بقیهٔ تنظیمات حفظ شد)" -ForegroundColor Cyan

# ---------------------- ۵) ری‌استارت برنامه ----------------------
Write-Host "-> توقف و راه‌اندازی دوبارهٔ برنامه (وظیفهٔ '$TaskApp') ..." -ForegroundColor Yellow
cmd /c "schtasks /End /TN $TaskApp >nul 2>&1"
cmd /c "taskkill /F /IM node.exe >nul 2>&1"
Start-Sleep -Seconds 3
cmd /c "schtasks /Run /TN $TaskApp >nul 2>&1"

Write-Host "-> بررسی سلامت برنامه ..." -ForegroundColor Yellow
$okLocal = $false
foreach ($i in 1..40) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$AppPort/" -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $okLocal = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}

# ---------------------- ۶) تأیید polling بات از لاگ ----------------------
Start-Sleep -Seconds 10   # بات ۳ ثانیه پس از بالا آمدن سرور شروع می‌شود + زمان getMe
$botLive = $false
try {
    $tail = Get-Content "$LogsDir\app.log" -Tail 50 -ErrorAction SilentlyContinue | Out-String
    if ($tail -match '\[bale-bot\] polling') { $botLive = $true }
} catch {}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
if ($botLive) {
    Write-Host "  توکن تنظیم شد و بات بله فعال است!"               -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  بات:            @$botName — polling فعال ✓"    -ForegroundColor Green
} else {
    Write-Host "  توکن ذخیره شد — وضعیت بات را در لاگ چک کنید"   -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  چک دستی بعد از ۳۰ ثانیه:"                      -ForegroundColor White
    Write-Host '  Select-String -Path C:\uastemdad\logs\app.log -Pattern "bale-bot","start-3003" -SimpleMatch | Select-Object -Last 10' -ForegroundColor White
    Write-Host "  سطر سالم:  [bale-bot] polling برای @$botName آغاز شد." -ForegroundColor White
}
if ($okLocal) {
    Write-Host "  برنامه:         در حال سرویس‌دهی روی پورت $AppPort ✓" -ForegroundColor Yellow
} else {
    Write-Host "  برنامه:         هنوز پاسخ نمی‌دهد — لاگ: $LogsDir\app.log" -ForegroundColor Red
}
Write-Host "  محل ذخیرهٔ توکن:  $EnvFile (سطر BALE_BOT_TOKEN)" -ForegroundColor Yellow
Write-Host ""
