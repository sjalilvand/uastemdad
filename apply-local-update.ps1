# ============================================================================
#   بیلد و راه‌اندازی مجدد با «کد موجود روی سرور» — بدون دریافت از گیت‌هاب
#
#   کاربرد: وقتی کد جدید به هر روشی (git am، کپی دستی فایل‌ها و…) روی
#   C:\uastemdad\app قرار گرفته است و می‌خواهید همان کد بیلد و بالا بیاید.
#   (update-app.ps1 همیشه از گیت‌هاب pull می‌کند و reset می‌زند؛ این اسکریپت نه.)
#
#   اجرا (PowerShell با Run as Administrator):
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\apply-local-update.ps1
#
#   این اسکریپت: قفل نگهداری می‌نویسد، برنامه را می‌بندد، prisma را همگام و
#   بیلد می‌گیرد و در پایان برنامه و HTTPS را بالا می‌آورد و سلامت را چک می‌کند.
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

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
Write-Host "  بیلد و راه‌اندازی از کدِ موجود روی سرور"        -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# ---------------------- بررسی دسترسی ----------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "خطا: اسکریپت باید در PowerShell با دسترسی Administrator اجرا شود." -ForegroundColor Red
    return
}
if (-not (Test-Path "$App\.git")) {
    Write-Host "خطا: مخزن کد در $App پیدا نشد — اول deploy.ps1 را اجرا کنید." -ForegroundColor Red
    return
}

# ---------------------- خواندن .env ----------------------
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
$env:DATABASE_URL = $dbUrl
$env:AUTH_SECRET  = $authSecret
$env:UPLOAD_DIR   = $uploadDir
$env:BALE_BOT_TOKEN = $baleToken
$env:BALE_BOT_ENABLED = $baleEnable
$env:SITE_URL     = $siteUrl
$env:NEXT_TELEMETRY_DISABLED = "1"
Write-Host "OK  تنظیمات .env خوانده شد" -ForegroundColor Cyan

# ---------------------- قفل نگهداری ----------------------
$maintLock = "$LogsDir\maintenance.lock"
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
[System.IO.File]::WriteAllText($maintLock, (Get-Date).ToString("o"))
function Remove-MaintLock { Remove-Item $maintLock -ErrorAction SilentlyContinue }

# ---------------------- توقف برنامه ----------------------
Write-Host "-> توقف برنامه ..." -ForegroundColor Yellow
cmd /c "schtasks /End /TN $TaskApp >nul 2>&1"
cmd /c "taskkill /F /IM node.exe >nul 2>&1"
Start-Sleep -Seconds 3

# ---------------------- prisma + بیلد ----------------------
Write-Host "-> همگام‌سازی دیتابیس (prisma) ..." -ForegroundColor Yellow
Set-Location $App
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در prisma generate." -ForegroundColor Red; Remove-MaintLock; return }
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در همگام‌سازی دیتابیس." -ForegroundColor Red; Remove-MaintLock; return }

Write-Host "-> بیلد نسخهٔ production (چند دقیقه — پنجره را نبندید) ..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build
if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$App\.next\standalone\server.js")) {
    Write-Host "خطا در بیلد — خروجی بالا را بررسی کنید." -ForegroundColor Red
    Write-Host "برای بازگشت به نسخهٔ قبلی: $Root\restart-app.cmd" -ForegroundColor Yellow
    Remove-MaintLock
    return
}
Write-Host "OK  بیلد کامل شد" -ForegroundColor Cyan

# ---------------------- راه‌اندازی دوباره ----------------------
Write-Host "-> راه‌اندازی دوبارهٔ برنامه و HTTPS ..." -ForegroundColor Yellow
Remove-MaintLock
cmd /c "schtasks /Run /TN $TaskApp >nul 2>&1"
if (Test-Path "$ToolsDir\caddy.exe") {
    cmd /c "schtasks /Run /TN $TaskProxy >nul 2>&1"
}

# ---------------------- بررسی سلامت ----------------------
Write-Host "-> بررسی سلامت (تا ۲ دقیقه) ..." -ForegroundColor Yellow
$okLocal = $false
foreach ($i in 1..40) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$AppPort/api/health" -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $okLocal = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}
$okHttps = $false
for ($i = 0; $i -lt 6; $i++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "https://$Domain/api/health" -TimeoutSec 8
        if ($r.StatusCode -eq 200) { $okHttps = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
if ($okLocal) {
    Write-Host "  برنامه با کد محلی بالا آمد و سالم است!"     -ForegroundColor Green
} else {
    Write-Host "  برنامه هنوز پاسخ نمی‌دهد — لاگ را بررسی کنید" -ForegroundColor Yellow
    Write-Host "  Get-Content $LogsDir\app.log -Tail 50"        -ForegroundColor Yellow
}
Write-Host "================================================" -ForegroundColor Green
if ($okLocal -and $okHttps) { Write-Host "  سایت:  https://$Domain — در دسترس ✓" -ForegroundColor Green }
elseif ($okLocal)           { Write-Host "  سایت:  https://$Domain — چند دقیقه بعد دوباره چک کنید" -ForegroundColor Yellow }
Write-Host "  پنل مدیریت:  https://$Domain/admin" -ForegroundColor Yellow
Write-Host ""
