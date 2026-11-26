# ============================================================================
#   نصب «پایشگر سامانه» — وظیفهٔ زمان‌بندی uastemdad-monitor (هر ۱ دقیقه)
#
#   اجرا (PowerShell با Run as Administrator):
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\install-monitor.ps1
#
#   بعد از نصب:
#     • هر ۱ دقیقه سلامت برنامه و HTTPS چک می‌شود
#     • اگر برنامه دان شده باشد تا ۳ بار خودکار ری‌استارت می‌شود
#     • پیام «بالا آمدن + مدت قطعی» از درون برنامه به همهٔ مدیرانِ بات بله
#       ارسال می‌شود (بدون نیاز به هیچ تنظیم اضافه)
#     • برای پیام‌های «دان است»/«HTTPS»/«دیسک» از خودِ پایشگر، شناسهٔ گفتگوی
#       خود را تنظیم کنید:  set-monitor-chat.ps1 -ChatId <شناسه>
#     • تست:  C:\uastemdad\app\scripts\monitor-app.ps1 -Test
# ============================================================================

$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$Root       = "C:\uastemdad"
$App        = "$Root\app"
$LogsDir    = "$Root\logs"
$TaskApp    = "uastemdad-app"
$TaskProxy  = "uastemdad-proxy"
$TaskMon    = "uastemdad-monitor"
$MonScript  = "$App\scripts\monitor-app.ps1"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  نصب پایشگر سامانهٔ مرکز علمی-کاربردی"           -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# ---------------------- ۱) بررسی دسترسی ----------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "خطا: اسکریپت باید در PowerShell با دسترسی Administrator اجرا شود." -ForegroundColor Red
    Write-Host "روی PowerShell راست‌کلیک → Run as Administrator → دوباره اجرا کنید." -ForegroundColor Yellow
    return
}
if (-not (Test-Path $MonScript)) {
    Write-Host "خطا: فایل پایشگر پیدا نشد: $MonScript" -ForegroundColor Red
    Write-Host "اول آخرین کد را بگیرید:  powershell -ExecutionPolicy Bypass -File $App\update-app.ps1" -ForegroundColor Yellow
    return
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

# ---------------------- ۲) وظیفهٔ برنامه باید موجود باشد ----------------------
$appExists = (schtasks /Query /TN $TaskApp 2>$null) -ne $null
if (-not $appExists) {
    Write-Host "هشدار: وظیفهٔ برنامه '$TaskApp' وجود ندارد — اول deploy.ps1 را اجرا کنید." -ForegroundColor Yellow
} else {
    Write-Host "OK  وظیفهٔ برنامه '$TaskApp' موجود است" -ForegroundColor Cyan
}

# ---------------------- ۳) ساخت وظیفهٔ پایشگر (هر ۱ دقیقه) ----------------------
Write-Host "-> ساخت وظیفهٔ زمان‌بندی '$TaskMon' (هر ۱ دقیقه) ..." -ForegroundColor Yellow
schtasks /Create /F /TN $TaskMon /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $MonScript" /SC MINUTE /MO 1 /RU SYSTEM /RL HIGHEST
if ($LASTEXITCODE -ne 0) {
    Write-Host "خطا در ساخت وظیفهٔ پایشگر — خروجی بالا را بررسی کنید." -ForegroundColor Red
    return
}
Write-Host "OK  وظیفهٔ پایشگر ساخته شد و از همین حالا هر ۱ دقیقه اجرا می‌شود" -ForegroundColor Cyan

# ---------------------- ۴) بررسی وضعیت وظایف ----------------------
Write-Host ""
Write-Host "  وظایف زمان‌بندی سامانه:" -ForegroundColor White
foreach ($t in @($TaskApp, $TaskProxy, $TaskMon)) {
    $info = schtasks /Query /TN $t /FO LIST 2>$null | Out-String
    $state = "نصب نشده"
    if ($info -match "Status:\s*(.+)") { $state = $Matches[1].Trim() }
    Write-Host ("    {0,-20} : {1}" -f $t, $state) -ForegroundColor Yellow
}

# ---------------------- ۵) تست پایش ----------------------
Write-Host ""
Write-Host "-> اجرای آزمایشی پایشگر (وضعیت + پیام آزمایشی بات) ..." -ForegroundColor Yellow
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $MonScript -Test

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  نصب کامل شد — سامانه از این پس خودش را پایش می‌کند" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  لاگ پایش:        $LogsDir\monitor.log"                  -ForegroundColor Yellow
Write-Host "  وضعیت پایش:      $MonScript -Test"                      -ForegroundColor Yellow
Write-Host "  عیب‌یابی:         $MonScript -NoRestart (فقط هشدار)"     -ForegroundColor Yellow
Write-Host ""
Write-Host "  پیام‌های بات:" -ForegroundColor White
Write-Host "    • «بالا آمدن + مدت قطعی»  → خودکار به همهٔ مدیرانِ بات می‌رسد (بدون تنظیم)" -ForegroundColor White
Write-Host "    • «دان است / HTTPS / دیسک» → فقط وقتی MONITOR_CHAT_ID تنظیم شده باشد:" -ForegroundColor White
Write-Host "        ۱) در بات بله دستور /status بزنید → «شناسهٔ گفتگوی شما» را کپی کنید" -ForegroundColor Yellow
Write-Host "        ۲) powershell -ExecutionPolicy Bypass -File $App\set-monitor-chat.ps1 -ChatId <شناسه>" -ForegroundColor Yellow
Write-Host ""
