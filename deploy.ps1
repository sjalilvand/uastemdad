# ============================================================================
#   استقرار کامل سامانهٔ «مرکز علمی–کاربردی کمیته امداد» روی ویندوز سرور
#   دامنه:  https://uastemdad.ir      سرور: 94.182.131.94
#   نحوهٔ اجرا: PowerShell را با Run as Administrator باز کنید و کل این
#   اسکریپت را یک‌جا Paste کنید (یا ذخیره و اجرا: deploy.ps1)
#
#   این اسکریپت به‌صورت خودکار:
#     ۱) Git و Node.js را (اگر نصب نیستند) نصب می‌کند
#     ۲) آخرین نسخهٔ کد را از گیت‌هاب دریافت/به‌روزرسانی می‌کند
#     ۳) وابستگی‌ها را نصب، دیتابیس را می‌سازد و پروژه را بیلد می‌کند
#     ۴) سایت را به‌عنوان سرویس ویندوزی (خودکار-استارت و ضدِ ری‌استارت) اجرا می‌کند
#     ۵) با Caddy، دامنه را روی HTTPS با گواهی رایگان Let's Encrypt فعال می‌کند
#
#   به‌روزرسانی نسخه‌های بعدی: کافی است همین اسکریپت را دوباره اجرا کنید؛
#   داده‌ها (اخبار، تنظیمات، فایل‌های آپلودی) حفظ می‌شوند.
#
#   پیش‌نیازهای بیرونی (خارج از این سرور):
#     • رکورد A دامنهٔ uastemdad.ir باید به 94.182.131.94 اشاره کند
#     • پورت‌های 80 و 443 در شبکه/فایروال سازمان به این سرور باز باشند
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ------------------------------ تنظیمات ------------------------------
# توکن گیت‌هاب فقط وقتی لازم است که مخزن خصوصی (private) شود؛ الان عمومی است و خالی می‌ماند.
$Token    = ""
$RepoUrl  = "https://github.com/sjalilvand/uastemdad.git"
$Domain   = "uastemdad.ir"
$ServerIP = "94.182.131.94"
$AppPort  = 3003
$Root     = "C:\uastemdad"
$ToolsDir = "$Root\tools"
$LogsDir  = "$Root\logs"
$SvcApp   = "uastemdad-app"
$SvcProxy = "uastemdad-proxy"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  نصب و استقرار سامانهٔ مرکز علمی-کاربردی"        -ForegroundColor Green
Write-Host "  دامنه: https://$Domain"                         -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# ---------------------- ۱) بررسی دسترسی Administrator ----------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "خطا: اسکریپت باید در PowerShell با دسترسی Administrator اجرا شود." -ForegroundColor Red
    Write-Host "روی PowerShell راست‌کلیک → Run as Administrator → دوباره Paste کنید." -ForegroundColor Yellow
    return
}

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
}

function Download-File($url, $out) {
    Write-Host "  دریافت: $url" -ForegroundColor DarkGray
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $out
}

# ---------------------- ۲) نصب Git (در صورت نبود) ----------------------
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "OK  Git از قبل نصب است ($(git --version))" -ForegroundColor Cyan
} else {
    Write-Host "-> نصب Git for Windows ..." -ForegroundColor Yellow
    $rel   = Invoke-RestMethod -Uri "https://api.github.com/repos/git-for-windows/git/releases/latest"
    $asset = $rel.assets | Where-Object { $_.name -match '^Git-.*-64-bit\.exe$' } | Select-Object -First 1
    if (-not $asset) { Write-Host "خطا: پیدا کردن نصب‌کنندهٔ Git ناموفق بود؛ Git را دستی از git-scm.com نصب کنید." -ForegroundColor Red; return }
    $installer = "$env:TEMP\$($asset.name)"
    Download-File $asset.browser_download_url $installer
    Start-Process $installer -ArgumentList '/VERYSILENT','/NORESTART','/SUPPRESSMSGBOXES','/NOCANCEL' -Wait
    Refresh-Path
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host "خطا: نصب Git ناموفق بود." -ForegroundColor Red; return }
    Write-Host "OK  Git نصب شد" -ForegroundColor Cyan
}

# ---------------------- ۳) نصب Node.js 22 LTS (در صورت نبود) ----------------------
$needNode = $true
if (Get-Command node -ErrorAction SilentlyContinue) {
    $major = [int]((node --version) -replace '^v(\d+)\..*$','$1')
    if ($major -ge 20) { $needNode = $false; Write-Host "OK  Node.js از قبل نصب است ($(node --version))" -ForegroundColor Cyan }
}
if ($needNode) {
    Write-Host "-> نصب Node.js 22 LTS (چند دقیقه) ..." -ForegroundColor Yellow
    $listing = (Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/latest-v22.x/").Content
    if ($listing -match 'node-(v22\.\d+\.\d+)-x64\.msi') {
        $ver = $Matches[1]
        $msi = "$env:TEMP\node-$ver-x64.msi"
        Download-File "https://nodejs.org/dist/latest-v22.x/node-$ver-x64.msi" $msi
        $p = Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait -PassThru
        if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { Write-Host "خطا: نصب Node.js ناموفق بود (کد $($p.ExitCode))." -ForegroundColor Red; return }
        Refresh-Path
        Write-Host "OK  Node.js $($ver) نصب شد ($(node --version))" -ForegroundColor Cyan
    } else {
        Write-Host "خطا: پیدا کردن نسخهٔ Node.js ناموفق بود؛ دستی از nodejs.org نسخهٔ ۲۲ LTS را نصب کنید." -ForegroundColor Red
        return
    }
}
$NodeExe = (Get-Command node).Path

# ---------------------- ۴) دریافت کد از گیت‌هاب ----------------------
Write-Host "-> دریافت آخرین نسخهٔ کد از گیت‌هاب ..." -ForegroundColor Yellow
$useToken = ($Token -ne "")
$TokenUrl = "https://$Token@github.com/sjalilvand/uastemdad.git"
if (Test-Path "$Root\.git") {
    git -C $Root fetch origin
    if ($LASTEXITCODE -ne 0 -and $useToken) {
        git -C $Root remote set-url origin $TokenUrl
        git -C $Root fetch origin
    }
    git -C $Root reset --hard origin/main
    Write-Host "OK  نسخهٔ قبلی یافت شد و به آخرین نسخهٔ گیت‌هاب به‌روزرسانی شد" -ForegroundColor Cyan
} elseif (Test-Path $Root) {
    Write-Host "خطا: پوشهٔ $Root از قبل وجود دارد ولی مخزن گیت نیست؛ آن را تغییرنام/خالی کنید یا مسیر `\$Root را در ابتدای اسکریپت عوض کنید." -ForegroundColor Red
    return
} else {
    git clone $RepoUrl $Root
    if ($LASTEXITCODE -ne 0 -and $useToken) { git clone $TokenUrl $Root }
    if ($LASTEXITCODE -ne 0) { Write-Host "خطا: clone از گیت‌هاب ناموفق بود (اینترنت را بررسی کنید)." -ForegroundColor Red; return }
    if ($useToken) { git -C $Root remote set-url origin $TokenUrl }
    Write-Host "OK  کد در $Root دریافت شد" -ForegroundColor Cyan
}
Set-Location $Root

# ---------------------- ۵) نصب وابستگی‌ها ----------------------
Write-Host "-> نصب وابستگی‌ها (npm install — چند دقیقه) ..." -ForegroundColor Yellow
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در نصب وابستگی‌ها." -ForegroundColor Red; return }

# ---------------------- ۶) فایل .env و پوشه‌های داده ----------------------
New-Item -ItemType Directory -Force -Path "$Root\db","$Root\data\uploads","$Root\logs" | Out-Null
$dbUrl = "file:C:/uastemdad/db/custom.db"
$envContent = 
$authSecret = $null
if (Test-Path "$Root\.env") {
    foreach ($line in Get-Content "$Root\.env") {
        if ($line -match '^AUTH_SECRET=(.+)$') { $authSecret = $Matches[1] }
    }
}
if (-not $authSecret) { $authSecret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N") }
$envContent = @"
DATABASE_URL=$dbUrl
AUTH_SECRET=$authSecret
UPLOAD_DIR=C:/uastemdad/data/uploads
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
"@
# .env باید بدون BOM نوشته شود
[System.IO.File]::WriteAllText("$Root\.env", ($envContent -replace "\r\n","\n"))
# متغیرها برای همین نشست (prisma / seed / build)
$env:DATABASE_URL = $dbUrl
$env:AUTH_SECRET  = $authSecret
$env:UPLOAD_DIR   = "C:/uastemdad/data/uploads"
$env:NEXT_TELEMETRY_DISABLED = "1"
Write-Host "OK  فایل .env و پوشه‌های داده آماده شد" -ForegroundColor Cyan

# ---------------------- ۷) ساخت دیتابیس و داده‌های اولیه ----------------------
Write-Host "-> همگام‌سازی دیتابیس (prisma) ..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در prisma generate." -ForegroundColor Red; return }
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در ساخت دیتابیس." -ForegroundColor Red; return }
Write-Host "-> داده‌های اولیه (اگر قبلاً نصب شده، داده‌ها حفظ می‌شود) ..." -ForegroundColor Yellow
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در داده‌های اولیه." -ForegroundColor Red; return }

# ---------------------- ۸) بیلد نسخهٔ production ----------------------
Write-Host "-> بیلد نسخهٔ production (چند دقیقه — پنجره را نبندید) ..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build
if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$Root\.next\standalone\server.js")) {
    Write-Host "خطا در بیلد پروژه." -ForegroundColor Red; return
}
Write-Host "OK  بیلد کامل شد" -ForegroundColor Cyan

# ---------------------- ۹) آزادسازی پورت‌های 80 و 443 ----------------------
Write-Host "-> بررسی پورت‌های 80 و 443 ..." -ForegroundColor Yellow
$iis = Get-Service W3SVC -ErrorAction SilentlyContinue
if ($iis -and $iis.Status -eq 'Running') {
    Write-Host "   IIS (سایت قبلی وردپرس) فعال است — برای آزادشدن پورت‌ها متوقف می‌شود ..." -ForegroundColor Yellow
    Stop-Service W3SVC -Force
    Set-Service W3SVC -StartupType Manual
    $was = Get-Service WAS -ErrorAction SilentlyContinue
    if ($was -and $was.Status -eq 'Running') { Stop-Service WAS -Force; Set-Service WAS -StartupType Manual }
    Write-Host "OK  IIS متوقف شد (برای فعال‌سازی مجدد: Start-Service W3SVC)" -ForegroundColor Cyan
}
Start-Sleep -Seconds 2
$busy = Get-NetTCPConnection -LocalPort 80,443 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    $names = $busy | ForEach-Object { (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName } | Sort-Object -Unique
    Write-Host "خطا: پورت‌های 80/443 توسط این برنامه‌ها اشغال‌اند: $($names -join ', ')" -ForegroundColor Red
    Write-Host "برنامهٔ فوق را متوقف/تنظیم کنید و اسکریپت را دوباره اجرا کنید." -ForegroundColor Yellow
    return
}
Write-Host "OK  پورت‌های 80 و 443 آزاد هستند" -ForegroundColor Cyan

# ---------------------- ۱۰) قواعد فایروال ----------------------
Remove-NetFirewallRule -DisplayName "Uastemdad HTTP"  -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Uastemdad HTTPS" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Uastemdad HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "Uastemdad HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow | Out-Null
Write-Host "OK  فایروال ویندوز برای پورت‌های 80 و 443 باز شد" -ForegroundColor Cyan

# ---------------------- ۱۱) نصب NSSM و سرویس ویندوزی برنامه ----------------------
Write-Host "-> نصب سرویس ویندوزی برنامه ..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
$nssmZip = "$env:TEMP\nssm-2.24.zip"
Download-File "https://nssm.cc/release/nssm-2.24.zip" $nssmZip
Expand-Archive -Path $nssmZip -DestinationPath "$env:TEMP\nssm" -Force
$Nssm = "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe"
if (-not (Test-Path $Nssm)) { Write-Host "خطا: دریافت NSSM ناموفق بود." -ForegroundColor Red; return }
Copy-Item $Nssm "$ToolsDir\nssm.exe" -Force
$Nssm = "$ToolsDir\nssm.exe"

foreach ($svc in @($SvcApp, $SvcProxy)) {
    if (Get-Service $svc -ErrorAction SilentlyContinue) {
        & $Nssm stop $svc | Out-Null
        & $Nssm remove $svc confirm | Out-Null
    }
}

& $Nssm install $SvcApp $NodeExe "$Root\scripts\start-3003.js"
& $Nssm set $SvcApp AppDirectory $Root
& $Nssm set $SvcApp Description "Saman-e UAST Em Dad - Next.js (port $AppPort)"
& $Nssm set $SvcApp AppStdout "$LogsDir\app.log"
& $Nssm set $SvcApp AppStderr "$LogsDir\app-err.log"
& $Nssm set $SvcApp AppRotateFiles 1
& $Nssm set $SvcApp AppRotateBytes 10485760
& $Nssm set $SvcApp Start SERVICE_AUTO_START
& $Nssm set $SvcApp AppEnvironmentExtra "NODE_ENV=production" "PORT=$AppPort" "HOSTNAME=127.0.0.1" "DATABASE_URL=$dbUrl" "AUTH_SECRET=$authSecret" "UPLOAD_DIR=C:/uastemdad/data/uploads" "NEXT_TELEMETRY_DISABLED=1"
& $Nssm start $SvcApp
Write-Host "OK  سرویس برنامهٔ '$SvcApp' نصب و اجرا شد (استارت خودکار پس از ری‌استارت سرور)" -ForegroundColor Cyan

# ---------------------- ۱۲) نصب Caddy برای HTTPS دامنه ----------------------
Write-Host "-> نصب Caddy (گواهی HTTPS رایگان و خودکار Let's Encrypt) ..." -ForegroundColor Yellow
Download-File "https://github.com/caddyserver/caddy/releases/latest/download/caddy_windows_amd64.exe" "$ToolsDir\caddy.exe"

$Caddyfile = @"
{
        admin off
}

$Domain {
        encode gzip
        reverse_proxy 127.0.0.1:$AppPort
}

# اگر برای www هم رکورد DNS تعریف کردید، این بخش را از حالت کامنت خارج کنید:
# www.$Domain {
#       redir https://$Domain{uri} permanent
# }
"@
# Caddyfile باید بدون BOM و با خط‌های LF نوشته شود تا Caddy درست بخواند
[System.IO.File]::WriteAllText("$Root\Caddyfile", ($Caddyfile -replace "`r`n","`n"))

& $Nssm install $SvcProxy "$ToolsDir\caddy.exe" "run --config $Root\Caddyfile"
& $Nssm set $SvcProxy AppDirectory $Root
& $Nssm set $SvcProxy Description "Caddy reverse proxy - HTTPS for $Domain"
& $Nssm set $SvcProxy AppStdout "$LogsDir\caddy.log"
& $Nssm set $SvcProxy AppStderr "$LogsDir\caddy-err.log"
& $Nssm set $SvcProxy AppRotateFiles 1
& $Nssm set $SvcProxy AppRotateBytes 10485760
& $Nssm set $SvcProxy Start SERVICE_AUTO_START
& $Nssm start $SvcProxy
Write-Host "OK  سرویس HTTPS '$SvcProxy' نصب و اجرا شد" -ForegroundColor Cyan

# ---------------------- ۱۳) بررسی سلامت ----------------------
Write-Host "-> بررسی سلامت ..." -ForegroundColor Yellow
$okLocal = $false
foreach ($i in 1..30) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$AppPort/" -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $okLocal = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}
if ($okLocal) { Write-Host "OK  برنامه روی پورت $AppPort در حال سرویس‌دهی است" -ForegroundColor Cyan }
else { Write-Host "هشدار: برنامه هنوز پاسخ نمی‌دهد — لاگ: $LogsDir\app-err.log" -ForegroundColor Yellow }

# بررسی DNS
try {
    $dns = (Resolve-DnsName $Domain -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1).IPAddress
    if ($dns -eq $ServerIP) { Write-Host "OK  دامنهٔ $Domain درست به $ServerIP اشاره می‌کند" -ForegroundColor Cyan }
    else { Write-Host "هشدار: دامنهٔ $Domain الان به $dns اشاره می‌کند نه $ServerIP — رکورد A را در پنل دامنه اصلاح کنید. تا اصلاح DNS، گواهی HTTPS صادر نمی‌شود." -ForegroundColor Yellow }
} catch {
    Write-Host "هشدار: هنوز رکوردی برای $Domain پیدا نشد — در پنل دامنه، رکورد A  با مقدار $ServerIP بسازید." -ForegroundColor Yellow
}

# بررسی HTTPS (اگر DNS تازه تنظیم شده باشد ممکن است چند دقیقه طول بکشد)
try {
    if (-not ("TrustAll" -as [type])) {
        Add-Type -TypeDefinition "public static class TrustAll { public static void Set() { System.Net.ServicePointManager.ServerCertificateValidationCallback = (s,c,ch,e) => true; } }"
    }
    [TrustAll]::Set()
    $r = Invoke-WebRequest -UseBasicParsing -Uri "https://$Domain/" -TimeoutSec 20
    Write-Host "OK  سایت از طریق https://$Domain بالا آمده است" -ForegroundColor Green
} catch {
    Write-Host "هشدار: https://$Domain هنوز پاسخ نمی‌دهد. اگر DNS تازه تنظیم شده، طی ۵ تا ۳۰ دقیقه (پس از انتشار DNS) به‌صورت خودکار آماده می‌شود؛ Caddy خودش گواهی را می‌گیرد و سرویس را دوباره راه می‌اندازد." -ForegroundColor Yellow
}

# ---------------------- ۱۴) خلاصهٔ نهایی ----------------------
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  استقرار کامل شد!"                              -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  آدرس سایت:        https://$Domain"              -ForegroundColor Yellow
Write-Host "  پنل مدیریت:      https://$Domain/admin"         -ForegroundColor Yellow
Write-Host "  ورود مدیر:       admin / admin123  (بعد از اولین ورود تغییر دهید)" -ForegroundColor Yellow
Write-Host "  پوشهٔ برنامه:    $Root"                         -ForegroundColor Yellow
Write-Host "  لاگ برنامه:      $LogsDir\app.log"              -ForegroundColor Yellow
Write-Host "  لاگ HTTPS:       $LogsDir\caddy.log"            -ForegroundColor Yellow
Write-Host "  سرویس‌ها:        $SvcApp  +  $SvcProxy"         -ForegroundColor Yellow
Write-Host ""
Write-Host "  نکته‌های مهم:" -ForegroundColor White
Write-Host "   • به‌روزرسانی نسخهٔ جدید: همین اسکریپت را دوباره اجرا کنید (داده‌ها حفظ می‌شود)."
Write-Host "   • ری‌استارت سرویس‌ها:  Restart-Service $SvcApp   یا   Restart-Service $SvcProxy"
Write-Host "   • توقف/اجرای دستی:     Stop-Service $SvcApp    /    Start-Service $SvcApp"
Write-Host "   • حذف کامل:            & `"$ToolsDir\nssm.exe`" remove $SvcApp confirm   و   & `"$ToolsDir\nssm.exe`" remove $SvcProxy confirm"
Write-Host "   • امنیت: توکن گیت‌هاب در این اسکریپت ذخیره نمی‌شود (مخزن عمومی است)؛ توکن‌های استفاده‌شده در گفتگو را بعد از استقرار از حساب گیت‌هاب بچرخانید (Settings > Developer settings > Tokens)."
Write-Host ""
