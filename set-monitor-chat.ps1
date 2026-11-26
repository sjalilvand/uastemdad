# ============================================================================
#   تنظیم شناسهٔ گفتگوی مدیر برای پیام‌های مستقیم پایشگر (MONITOR_CHAT_ID)
#
#   پایشگر بیرونی (monitor-app.ps1) وقتی برنامه دان است و نمی‌تواند بالا بیاید
#   یا HTTPS/دیسک مشکل دارد، پیام بله می‌فرستد — به همین شناسه.
#   (پیام‌های «بالا آمدن» از درون برنامه به همهٔ مدیرانِ بات می‌رسد و به این
#    تنظیم نیاز ندارد.)
#
#   نحوهٔ پیدا کردن شناسه: در بات بله دستور /status بزنید → خط
#   «شناسهٔ گفتگوی شما» را کپی کنید.
#
#   اجرا (PowerShell با Run as Administrator):
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\set-monitor-chat.ps1
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\set-monitor-chat.ps1 -ChatId 123456789
# ============================================================================

param(
    [string]$ChatId = ""
)

$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$Root    = "C:\uastemdad"
$App     = "$Root\app"
$EnvFile = "$App\.env"
$MonApp  = "$App\scripts\monitor-app.ps1"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  تنظیم شناسهٔ پیام‌های پایش (MONITOR_CHAT_ID)"     -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "خطا: اسکریپت باید در PowerShell با دسترسی Administrator اجرا شود." -ForegroundColor Red
    return
}

# ---------------------- ۱) دریافت شناسه ----------------------
if ([string]::IsNullOrWhiteSpace($ChatId)) {
    Write-Host "شناسهٔ گفتگوی خود را وارد کنید (در بات بله با /status قابل دیدن است):" -ForegroundColor Yellow
    $ChatId = (Read-Host "شناسهٔ گفتگو").Trim()
}
$ChatId = $ChatId.Trim().Trim('"').Trim("'")
if ($ChatId -notmatch '^-?\d{3,}$') {
    Write-Host "خطا: شناسهٔ گفتگو باید عددی باشد. چیزی ذخیره نشد." -ForegroundColor Red
    return
}
if ($ChatId -eq '123456789') {
    Write-Host "خطا: 123456789 همان عدد نمونهٔ مستندات است، نه شناسهٔ واقعی شما!" -ForegroundColor Red
    Write-Host "  در بات بله دستور /status بزنید ← خط «شناسهٔ گفتگوی شما» را کپی کنید و" -ForegroundColor Yellow
    Write-Host "  دوباره اجرا کنید: set-monitor-chat.ps1 -ChatId <عدد واقعی>" -ForegroundColor Yellow
    Write-Host "  چیزی در .env ذخیره نشد." -ForegroundColor Red
    return
}

# ---------------------- ۲) ذخیره در .env (بدون دست‌زدن به بقیه) ----------------------
$lines = @()
if (Test-Path $EnvFile) { $lines = @(Get-Content $EnvFile) }
$lines = @($lines | Where-Object { $_ -notmatch '^\s*MONITOR_CHAT_ID\s*=' })
$lines += "MONITOR_CHAT_ID=$ChatId"
# مهم: بدون BOM ذخیره می‌شود؛ پارسر .env سطر اولِ BOM‌دار را نمی‌شناسد
[System.IO.File]::WriteAllLines($EnvFile, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "OK  MONITOR_CHAT_ID در $EnvFile ذخیره شد (بقیهٔ تنظیمات حفظ شد)" -ForegroundColor Cyan

# ---------------------- ۳) ارسال پیام آزمایشی ----------------------
Write-Host "-> ارسال پیام آزمایشی از پایشگر ..." -ForegroundColor Yellow
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $MonApp -Test

Write-Host ""
Write-Host "اگر پیام آزمایشی در بله رسید، کار تمام است." -ForegroundColor Green
Write-Host "از این پس پیام‌های «دان است / HTTPS / دیسک» هم به همین گفتگو می‌آید." -ForegroundColor White
Write-Host ""
