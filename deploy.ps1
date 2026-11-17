param([string]$Token = "")
# ============================================================================
#   استقرار کامل سامانهٔ «مرکز علمی–کاربردی کمیته امداد» روی ویندوز سرور
#   دامنه:  https://uastemdad.ir      سرور: 94.182.131.94
#
#   نحوهٔ اجرا: PowerShell را با Run as Administrator باز کنید و فایل را اجرا کنید:
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\deploy.ps1
#
#   این اسکریپت به‌صورت خودکار:
#     ۰) اگر DNS سرور گیت‌هاب را باز نکند، DNS را با سرویس‌های شکن/الکترو/... اصلاح می‌کند
#     ۱) Git و Node.js را (اگر نصب نیستند) از منبع اصلی + آینه‌های جایگزین نصب می‌کند
#     ۲) آخرین نسخهٔ کد را در C:\uastemdad\app دریافت/به‌روزرسانی می‌کند
#     ۳) وابستگی‌ها را نصب، دیتابیس را می‌سازد و پروژه را بیلد می‌کند
#     ۴) برنامه و Caddy را به‌صورت «وظیفهٔ زمان‌بندی» ویندوز با استارت خودکار پس از
#        ری‌استارت سرور و اجرای دوبارهٔ خودکار پس از خطا، بالا می‌آورد
#     ۵) با Caddy دامنه را روی HTTPS با گواهی رایگان Let's Encrypt فعال می‌کند
#
#   به‌روزرسانی نسخه‌های بعدی: کافی است همین اسکریپت را دوباره اجرا کنید؛
#   داده‌ها (اخبار، تنظیمات، فایل‌های آپلودی، دیتابیس) حفظ می‌شوند.
#
#   پیش‌نیازهای بیرونی (خارج از این سرور):
#     • رکورد A دامنهٔ uastemdad.ir باید به 94.182.131.94 اشاره کند
#     • پورت‌های 80 و 443 در شبکه/فایروال سازمان به این سرور باز باشند
#
#   نکته: اگر مخزن روزی خصوصی (private) شود، اسکریپت را این‌طور اجرا کنید:
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\deploy.ps1 -Token ghp_...
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ------------------------------ تنظیمات ------------------------------
$RepoUrl   = "https://github.com/sjalilvand/uastemdad.git"
$Domain    = "uastemdad.ir"
$ServerIP  = "94.182.131.94"
$AppPort   = 3003
$Root      = "C:\uastemdad"        # اسکریپت‌ها، لاگ‌ها، دیتابیس، ابزارها
$App       = "$Root\app"           # مخزن کد (git clone)
$ToolsDir  = "$Root\tools"
$LogsDir   = "$Root\logs"
$TaskApp   = "uastemdad-app"
$TaskProxy = "uastemdad-proxy"
$GitVer    = "2.47.1"
$NodeVer   = "22.14.0"

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
    Write-Host "روی PowerShell راست‌کلیک → Run as Administrator → دوباره اجرا کنید." -ForegroundColor Yellow
    return
}

# ---------------------- ۰) اصلاح خودکار DNS (مخصوص سرورهای داخل ایران) ----------------------
function Test-Resolve([string[]]$names) {
    foreach ($n in $names) {
        try { [void][System.Net.Dns]::GetHostAddresses($n) } catch { return $false }
    }
    return $true
}

function Set-DnsForAdapters([string[]]$servers) {
    $adapters = @()
    try {
        $adapters = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' -and $_.InterfaceDescription -notmatch 'Loopback' })
    } catch {}
    if ($adapters.Count -eq 0) { return }
    try {
        $adapters | Set-DnsClientServerAddress -ServerAddresses $servers -ErrorAction Stop | Out-Null
        return
    } catch {}
    # روش جایگزین با netsh (در ویندوزهای قدیمی‌تر)
    foreach ($a in $adapters) {
        try { netsh interface ip delete dns name="$($a.Name)" all | Out-Null } catch {}
        try { netsh interface ip set dns name="$($a.Name)" source=static addr=$($servers[0]) | Out-Null } catch {}
        $idx = 2
        for ($i = 1; $i -lt $servers.Count; $i++) {
            try { netsh interface ip add dns name="$($a.Name)" addr=$($servers[$i]) index=$idx | Out-Null } catch {}
            $idx++
        }
    }
}

$dnsHosts = @('github.com','raw.githubusercontent.com','api.github.com','objects.githubusercontent.com','nodejs.org','cdn.jsdelivr.net')
if (-not (Test-Resolve $dnsHosts)) {
    Write-Host "-> مشکل DNS: سرور نمی‌تواند آدرس‌های گیت‌هاب را باز کند — اصلاح خودکار DNS ..." -ForegroundColor Yellow
    $dnsSets = @(
        @('178.22.122.100','185.51.200.2'),
        @('78.157.42.100','78.157.42.101'),
        @('10.202.10.202','10.202.10.102'),
        @('10.202.10.10','10.202.10.11'),
        @('8.8.8.8','8.8.4.4','1.1.1.1')
    )
    $dnsFixed = $false
    foreach ($set in $dnsSets) {
        Write-Host "   تنظیم DNS روی: $($set -join ' , ')" -ForegroundColor DarkGray
        Set-DnsForAdapters $set
        try { Clear-DnsClientCache -ErrorAction SilentlyContinue } catch {}
        cmd /c "ipconfig /flushdns >nul 2>&1"
        Start-Sleep -Seconds 3
        if (Test-Resolve $dnsHosts) {
            Write-Host "OK  DNS اصلاح شد (سرویس: $($set -join ' , '))" -ForegroundColor Cyan
            $dnsFixed = $true
            break
        }
    }
    if (-not $dnsFixed) {
        Write-Host "هشدار: هیچ‌کدام از تنظیمات DNS جواب نداد؛ ادامه می‌دهیم. اگر دانلودها خطا دادند، فیلترینگ/فایروال سازمانی را بررسی کنید." -ForegroundColor Yellow
    }
} else {
    Write-Host "OK  DNS سرور سالم است" -ForegroundColor Cyan
}

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
}

function Download-File([string[]]$urls, [string]$out) {
    foreach ($u in $urls) {
        for ($try = 1; $try -le 3; $try++) {
            try {
                Write-Host "   دریافت (تلاش $try): $u" -ForegroundColor DarkGray
                Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $out -TimeoutSec 900
                if ((Get-Item $out -ErrorAction SilentlyContinue).Length -gt 0) { return $true }
            } catch { Start-Sleep -Seconds 3 }
        }
    }
    return $false
}

# ---------------------- ۲) نصب Git (در صورت نبود) ----------------------
$GitExe = "Git-$GitVer-64-bit.exe"
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "OK  Git از قبل نصب است ($(git --version))" -ForegroundColor Cyan
} else {
    Write-Host "-> نصب Git for Windows $GitVer ..." -ForegroundColor Yellow
    $installer = "$env:TEMP\$GitExe"
    $ok = Download-File @(
        "https://github.com/git-for-windows/git/releases/download/v$GitVer.windows.1/$GitExe",
        "https://registry.npmmirror.com/-/binary/git-for-windows/v$GitVer.windows.1/$GitExe",
        "https://mirrors.huaweicloud.com/git-for-windows/v$GitVer.windows.1/$GitExe"
    ) $installer
    if (-not $ok) {
        Write-Host "خطا: دریافت نصب‌کنندهٔ Git ناموفق بود. Git را دستی از https://git-scm.com/download/win نصب کنید و اسکریپت را دوباره اجرا کنید." -ForegroundColor Red
        return
    }
    Start-Process $installer -ArgumentList '/VERYSILENT','/NORESTART','/SUPPRESSMSGBOXES','/NOCANCEL' -Wait
    $gitPath = "C:\Program Files\Git\cmd"
    if (Test-Path $gitPath) {
        $mp = [Environment]::GetEnvironmentVariable('Path','Machine')
        if ($mp -notlike "*$gitPath*") {
            [Environment]::SetEnvironmentVariable('Path', "$mp;$gitPath", 'Machine')
        }
    }
    Refresh-Path
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "خطا: نصب Git ناموفق بود." -ForegroundColor Red
        return
    }
    Write-Host "OK  Git نصب شد ($(git --version))" -ForegroundColor Cyan
}

# ---------------------- ۳) نصب Node.js 22 LTS (در صورت نبود) ----------------------
$needNode = $true
if (Get-Command node -ErrorAction SilentlyContinue) {
    try {
        $major = [int]((node --version) -replace '^v(\d+)\..*$', '$1')
        if ($major -ge 20) {
            $needNode = $false
            Write-Host "OK  Node.js از قبل نصب است ($(node --version))" -ForegroundColor Cyan
        }
    } catch {}
}
if ($needNode) {
    Write-Host "-> نصب Node.js v$NodeVer LTS (چند دقیقه) ..." -ForegroundColor Yellow
    $msi = "$env:TEMP\node-$NodeVer-x64.msi"
    $ok = Download-File @(
        "https://nodejs.org/dist/v$NodeVer/node-v$NodeVer-x64.msi",
        "https://registry.npmmirror.com/-/binary/node/v$NodeVer/node-v$NodeVer-x64.msi",
        "https://mirrors.huaweicloud.com/nodejs/v$NodeVer/node-v$NodeVer-x64.msi",
        "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v$NodeVer/node-v$NodeVer-x64.msi"
    ) $msi
    if (-not $ok) {
        Write-Host "خطا: دریافت Node.js ناموفق بود؛ دستی از https://nodejs.org نسخهٔ LTS را نصب کنید و اسکریپت را دوباره اجرا کنید." -ForegroundColor Red
        return
    }
    $p = Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait -PassThru
    if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
        Write-Host "خطا: نصب Node.js ناموفق بود (کد $($p.ExitCode))." -ForegroundColor Red
        return
    }
    Refresh-Path
    Write-Host "OK  Node.js نصب شد ($(node --version))" -ForegroundColor Cyan
}
$NodeExe = (Get-Command node).Path

# ---------------------- ۴) دریافت کد از گیت‌هاب ----------------------
Write-Host "-> دریافت/به‌روزرسانی کد از گیت‌هاب در $App ..." -ForegroundColor Yellow
$gitUrl = $RepoUrl
if ($Token -ne "") { $gitUrl = "https://$Token@github.com/sjalilvand/uastemdad.git" }
$cloneDone = $false

if (Test-Path "$App\.git") {
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    git -C $App fetch origin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   تلاش دوباره برای fetch ..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 5
        git -C $App fetch origin
    }
    if ($LASTEXITCODE -ne 0 -and $Token -ne "") {
        git -C $App remote set-url origin $gitUrl
        git -C $App fetch origin
    }
    $fetchRc = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($fetchRc -ne 0) {
        Write-Host "خطا: به‌روزرسانی از گیت‌هاب ناموفق بود (اینترنت/DNS را بررسی کنید) و اسکریپت را دوباره اجرا کنید." -ForegroundColor Red
        return
    }
    git -C $App reset --hard origin/main
    Write-Host "OK  کد به آخرین نسخهٔ گیت‌هاب به‌روز شد" -ForegroundColor Cyan
    $cloneDone = $true
} elseif (Test-Path $App) {
    $bak = "$App-backup-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Write-Host "   پوشهٔ app بدون مخزن گیت است — به $bak منتقل می‌شود" -ForegroundColor DarkGray
    Move-Item $App $bak -Force
}

if (-not $cloneDone) {
    $cloned = $false
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    for ($try = 1; $try -le 3; $try++) {
        Write-Host "   clone (تلاش $try) ..." -ForegroundColor DarkGray
        git clone --depth 1 $gitUrl $App
        if ($LASTEXITCODE -eq 0) { $cloned = $true; break }
        Start-Sleep -Seconds 5
    }
    $ErrorActionPreference = $prev
    if (-not $cloned) {
        Write-Host "خطا: clone از گیت‌هاب ناموفق بود. اینترنت/DNS را بررسی کنید و اسکریپت را دوباره اجرا کنید." -ForegroundColor Red
        return
    }
    Write-Host "OK  کد در $App دریافت شد" -ForegroundColor Cyan
}
Set-Location $App

# ---------------------- ۵) توقف سرویس قبلی (برای به‌روزرسانی امن) ----------------------
cmd /c "schtasks /End /TN $TaskApp >nul 2>&1"
cmd /c "taskkill /F /IM node.exe >nul 2>&1"

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

# ---------------------- ۷) فایل .env و پوشه‌های داده ----------------------
New-Item -ItemType Directory -Force -Path "$Root\db","$Root\data\uploads","$LogsDir","$ToolsDir" | Out-Null
$dbUrl = "file:C:/uastemdad/db/custom.db"
$authSecret = $null
if (Test-Path "$App\.env") {
    foreach ($line in Get-Content "$App\.env") {
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
[System.IO.File]::WriteAllText("$App\.env", ($envContent -replace "`r`n", "`n"))
# متغیرها برای همین نشست (prisma / seed / build)
$env:DATABASE_URL = $dbUrl
$env:AUTH_SECRET  = $authSecret
$env:UPLOAD_DIR   = "C:/uastemdad/data/uploads"
$env:NEXT_TELEMETRY_DISABLED = "1"
Write-Host "OK  فایل .env و پوشه‌های داده آماده شد" -ForegroundColor Cyan

# ---------------------- ۸) ساخت دیتابیس و داده‌های اولیه ----------------------
Write-Host "-> همگام‌سازی دیتابیس (prisma) ..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در prisma generate." -ForegroundColor Red; return }
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در ساخت دیتابیس." -ForegroundColor Red; return }
Write-Host "-> داده‌های اولیه (حالت ارتقا — داده‌های قبلی حفظ می‌شود) ..." -ForegroundColor Yellow
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در داده‌های اولیه." -ForegroundColor Red; return }

# ---------------------- ۹) بیلد نسخهٔ production ----------------------
Write-Host "-> بیلد نسخهٔ production (چند دقیقه — پنجره را نبندید) ..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build
if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$App\.next\standalone\server.js")) {
    Write-Host "خطا در بیلد پروژه." -ForegroundColor Red
    return
}
Write-Host "OK  بیلد کامل شد" -ForegroundColor Cyan

# ---------------------- ۱۰) آزادسازی پورت‌های 80 و 443 ----------------------
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
    Write-Host "برنامهٔ فوق را متوقف کنید و اسکریپت را دوباره اجرا کنید." -ForegroundColor Yellow
    return
}
Write-Host "OK  پورت‌های 80 و 443 آزاد هستند" -ForegroundColor Cyan

# ---------------------- ۱۱) قواعد فایروال ----------------------
Remove-NetFirewallRule -DisplayName "Uastemdad HTTP"  -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Uastemdad HTTPS" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Uastemdad App"   -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Uastemdad HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80    -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "Uastemdad HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "Uastemdad App"   -Direction Inbound -Protocol TCP -LocalPort 3003 -Action Allow | Out-Null
Write-Host "OK  فایروال ویندوز برای پورت‌های 80، 443 و 3003 باز شد" -ForegroundColor Cyan

# ---------------------- ۱۲) دانلود Caddy برای HTTPS دامنه ----------------------
Write-Host "-> دریافت Caddy (گواهی HTTPS رایگان و خودکار Let's Encrypt) ..." -ForegroundColor Yellow
cmd /c "schtasks /End /TN $TaskProxy >nul 2>&1"
cmd /c "taskkill /F /IM caddy.exe >nul 2>&1"
$caddyOk = Download-File @(
    "https://github.com/caddyserver/caddy/releases/latest/download/caddy_windows_amd64.exe",
    "https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_windows_amd64.exe"
) "$ToolsDir\caddy.exe"
if (-not $caddyOk) {
    Write-Host "هشدار: دریافت Caddy ناموفق بود — HTTPS فعلاً فعال نمی‌شود. سایت روی http://${ServerIP}:3003 کار می‌کند؛ بعداً همین اسکریپت را دوباره اجرا کنید." -ForegroundColor Yellow
}

# ---------------------- ۱۳) فایل‌های اجرا و راه‌اندازی خودکار ----------------------
$runAppCmd = @"
@echo off
rem auto-generated by deploy.ps1
cd /d $App
set NODE_ENV=production
set PORT=$AppPort
set HOSTNAME=127.0.0.1
set DATABASE_URL=$dbUrl
set AUTH_SECRET=$authSecret
set UPLOAD_DIR=C:/uastemdad/data/uploads
set NEXT_TELEMETRY_DISABLED=1
:loop
if exist "$LogsDir\app.log" for %%A in ("$LogsDir\app.log") do if %%~zA GTR 10485760 move /y "$LogsDir\app.log" "$LogsDir\app.old.log" >nul
"$NodeExe" scripts\start-3003.js >> "$LogsDir\app.log" 2>&1
timeout /t 5 /nobreak >nul
goto loop
"@
[System.IO.File]::WriteAllText("$Root\run-app.cmd", $runAppCmd)

$restartAppCmd = @"
@echo off
schtasks /End /TN "$TaskApp" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
schtasks /Run /TN "$TaskApp" >nul 2>&1
echo Application restarted - wait about one minute.
"@
[System.IO.File]::WriteAllText("$Root\restart-app.cmd", $restartAppCmd)

if ($caddyOk) {
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
#         redir https://$Domain{uri} permanent
# }
"@
    [System.IO.File]::WriteAllText("$Root\Caddyfile", ($Caddyfile -replace "`r`n", "`n"))

    $runCaddyCmd = @"
@echo off
rem auto-generated by deploy.ps1
cd /d $Root
:loop
if exist "$LogsDir\caddy.log" for %%A in ("$LogsDir\caddy.log") do if %%~zA GTR 10485760 move /y "$LogsDir\caddy.log" "$LogsDir\caddy.old.log" >nul
"$ToolsDir\caddy.exe" run --config "$Root\Caddyfile" >> "$LogsDir\caddy.log" 2>&1
timeout /t 5 /nobreak >nul
goto loop
"@
    [System.IO.File]::WriteAllText("$Root\run-caddy.cmd", $runCaddyCmd)

    $restartCaddyCmd = @"
@echo off
schtasks /End /TN "$TaskProxy" >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
schtasks /Run /TN "$TaskProxy" >nul 2>&1
echo Caddy restarted.
"@
    [System.IO.File]::WriteAllText("$Root\restart-caddy.cmd", $restartCaddyCmd)
}
Write-Host "OK  فایل‌های اجرا ساخته شدند (run-app.cmd / run-caddy.cmd / restart-app.cmd / restart-caddy.cmd)" -ForegroundColor Cyan

# ---------------------- ۱۴) ساخت «وظیفهٔ زمان‌بندی» ویندوز (استارت خودکار پس از ری‌استارت) ----------------------
Write-Host "-> ساخت وظایف زمان‌بندی و اجرا ..." -ForegroundColor Yellow
schtasks /Create /F /TN $TaskApp /TR "$Root\run-app.cmd" /SC ONSTART /RU SYSTEM /RL HIGHEST
if ($LASTEXITCODE -ne 0) { Write-Host "خطا در ساخت وظیفهٔ برنامه ($TaskApp)." -ForegroundColor Red; return }
schtasks /Run /TN $TaskApp
Write-Host "OK  وظیفهٔ برنامهٔ '$TaskApp' اجرا شد (پس از هر ری‌استارت سرور هم خودکار اجرا می‌شود)" -ForegroundColor Cyan

if ($caddyOk) {
    schtasks /Create /F /TN $TaskProxy /TR "$Root\run-caddy.cmd" /SC ONSTART /RU SYSTEM /RL HIGHEST
    if ($LASTEXITCODE -ne 0) { Write-Host "خطا در ساخت وظیفهٔ HTTPS ($TaskProxy)." -ForegroundColor Red; return }
    schtasks /Run /TN $TaskProxy
    Write-Host "OK  وظیفهٔ HTTPS '$TaskProxy' اجرا شد" -ForegroundColor Cyan
}

# ---------------------- ۱۵) بررسی سلامت ----------------------
Write-Host "-> بررسی سلامت ..." -ForegroundColor Yellow
$okLocal = $false
foreach ($i in 1..30) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$AppPort/" -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $okLocal = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}
if ($okLocal) {
    Write-Host "OK  برنامه روی پورت $AppPort در حال سرویس‌دهی است" -ForegroundColor Cyan
} else {
    Write-Host "هشدار: برنامه هنوز پاسخ نمی‌دهد — لاگ: $LogsDir\app.log | راه‌اندازی دوباره: $Root\restart-app.cmd" -ForegroundColor Yellow
}

# بررسی DNS دامنه
try {
    $dns = (Resolve-DnsName $Domain -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1).IPAddress
    if ($dns -eq $ServerIP) {
        Write-Host "OK  دامنهٔ $Domain درست به $ServerIP اشاره می‌کند" -ForegroundColor Cyan
    } else {
        Write-Host "هشدار: دامنهٔ $Domain الان به $dns اشاره می‌کند نه $ServerIP — رکورد A را در پنل دامنه اصلاح کنید. تا اصلاح DNS، گواهی HTTPS صادر نمی‌شود." -ForegroundColor Yellow
    }
} catch {
    Write-Host "هشدار: هنوز رکوردی برای $Domain پیدا نشد — در پنل دامنه، رکورد A با مقدار $ServerIP بسازید." -ForegroundColor Yellow
}

# بررسی HTTPS (اگر DNS تازه تنظیم شده باشد ممکن است چند دقیقه طول بکشد)
if ($caddyOk) {
    try {
        if (-not ("TrustAll" -as [type])) {
            Add-Type -TypeDefinition "public static class TrustAll { public static void Set() { System.Net.ServicePointManager.ServerCertificateValidationCallback = (s,c,ch,e) => true; } }"
        }
        [TrustAll]::Set()
        $r = Invoke-WebRequest -UseBasicParsing -Uri "https://$Domain/" -TimeoutSec 20
        Write-Host "OK  سایت از طریق https://$Domain بالا آمده است" -ForegroundColor Green
    } catch {
        Write-Host "هشدار: https://$Domain هنوز پاسخ نمی‌دهد. اگر DNS تازه تنظیم شده، طی ۵ تا ۳۰ دقیقه به‌صورت خودکار آماده می‌شود؛ Caddy خودش گواهی را می‌گیرد. لاگ: $LogsDir\caddy.log" -ForegroundColor Yellow
    }
}

# ---------------------- ۱۶) خلاصهٔ نهایی ----------------------
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  استقرار کامل شد!"                              -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  آدرس سایت:        https://$Domain"                 -ForegroundColor Yellow
Write-Host "  دسترسی موقت:      http://${ServerIP}:$AppPort  (تا وقتی DNS دامنه تنظیم نشده)" -ForegroundColor Yellow
Write-Host "  پنل مدیریت:      https://$Domain/admin"           -ForegroundColor Yellow
Write-Host "  ورود مدیر:       admin / admin123  (بعد از اولین ورود تغییر دهید)" -ForegroundColor Yellow
Write-Host "  پوشهٔ برنامه:    $App"                            -ForegroundColor Yellow
Write-Host "  دیتابیس:         $Root\db\custom.db  (SQLite)"    -ForegroundColor Yellow
Write-Host "  فایل‌های آپلودی: $Root\data\uploads"              -ForegroundColor Yellow
Write-Host "  لاگ برنامه:      $LogsDir\app.log"                -ForegroundColor Yellow
Write-Host "  لاگ HTTPS:       $LogsDir\caddy.log"              -ForegroundColor Yellow
Write-Host ""
Write-Host "  نکته‌های مهم:" -ForegroundColor White
Write-Host "   • به‌روزرسانی نسخهٔ جدید: همین اسکریپت را دوباره اجرا کنید (داده‌ها حفظ می‌شود)."
Write-Host "   • ری‌استارت برنامه:  $Root\restart-app.cmd     ری‌استارت HTTPS:  $Root\restart-caddy.cmd"
Write-Host "   • دیدن وظایف:       schtasks /query /tn $TaskApp  و  schtasks /query /tn $TaskProxy"
Write-Host "   • پاک‌کردن لاگ‌ها:   echo. > `"$LogsDir\app.log`""
Write-Host "   • امنیت: توکن گیت‌هاب در این اسکریپت ذخیره نمی‌شود؛ توکن‌های استفاده‌شده در گفتگو را بعد از استقرار از حساب گیت‌هاب بچرخانید (Settings > Developer settings > Tokens)."
Write-Host ""
