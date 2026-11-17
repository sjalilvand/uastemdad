# =====================================================================
#  fix-https.ps1  —  اتصال HTTPS و دسترسی بیرونی سامانهٔ uastemdad.ir
#  کاری که می‌کند:
#    ۱) خط‌مشی فایروال ویندوز را از حالت «مسدودسازی همیشگی» اصلاح می‌کند
#       و پورت‌های 80 / 443 / 3003 را روی همهٔ پروفایل‌ها باز می‌کند
#    ۲) برنامهٔ Next.js را روی همهٔ اینترفیس‌ها (0.0.0.0) اجرا می‌کند تا
#       آدرس موقت http://94.182.131.94:3003 از بیرون هم باز شود
#    ۳) وب‌سرور Caddy را از منبع رسمی caddyserver.com (بدون گیت‌هاب،
#       مناسب ایران) می‌گیرد و HTTPS با گواهی رایگان Let's Encrypt فعال می‌کند
#  اجرا:  powershell -ExecutionPolicy Bypass -File C:\uastemdad\fix-https.ps1
# =====================================================================

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'

$Root     = 'C:\uastemdad'
$App      = "$Root\app"
$Tools    = "$Root\tools"
$Logs     = "$Root\logs"
$Domain   = 'uastemdad.ir'
$ServerIP = '94.182.131.94'
$AppPort  = 3003
$TaskApp   = 'uastemdad-app'
$TaskProxy = 'uastemdad-proxy'

Write-Host '================================================' 
Write-Host "  رفع مشکل HTTPS و دسترسی — $Domain"
Write-Host '================================================' 

function Get-File([string[]]$urls, [string]$out, [int]$minBytes) {
    foreach ($u in $urls) {
        for ($try = 1; $try -le 3; $try++) {
            try {
                Write-Host "   دریافت (تلاش $try): $u" -ForegroundColor DarkGray
                Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $out -TimeoutSec 900
                if ((Get-Item $out -ErrorAction SilentlyContinue).Length -ge $minBytes) { return $true }
            } catch { Start-Sleep -Seconds 2 }
        }
    }
    return $false
}

# ---------- ۱) فایروال ----------
Write-Host '-> ۱) اصلاح فایروال ویندوز ...' -ForegroundColor Yellow
cmd /c "netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound" | Out-Null
Remove-NetFirewallRule -DisplayName 'Uastemdad HTTP'  -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName 'Uastemdad HTTPS' -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName 'Uastemdad App'   -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'Uastemdad HTTP'  -Direction Inbound -Protocol TCP -LocalPort 80    -Action Allow -Profile Any | Out-Null
New-NetFirewallRule -DisplayName 'Uastemdad HTTPS' -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow -Profile Any | Out-Null
New-NetFirewallRule -DisplayName 'Uastemdad App'   -Direction Inbound -Protocol TCP -LocalPort 3003 -Action Allow -Profile Any | Out-Null
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction | Format-Table -AutoSize
Write-Host 'OK  پورت‌های 80 / 443 / 3003 در فایروال ویندوز باز شد' -ForegroundColor Cyan

# ---------- ۲) اجرای برنامه روی همهٔ اینترفیس‌ها ----------
Write-Host '-> ۲) در دسترس‌کردن برنامه روی همهٔ اینترفیس‌ها (0.0.0.0) ...' -ForegroundColor Yellow
$runApp = "$Root\run-app.cmd"
if (Test-Path $runApp) {
    $content = [System.IO.File]::ReadAllText($runApp)
    $content = $content -replace 'set HOSTNAME=127\.0\.0\.1', 'set HOSTNAME=0.0.0.0'
    [System.IO.File]::WriteAllText($runApp, $content)
    Write-Host 'OK  فایل اجرای برنامه اصلاح شد' -ForegroundColor Cyan
}
cmd /c "schtasks /End /TN $TaskApp >nul 2>&1"
cmd /c "taskkill /F /IM node.exe >nul 2>&1"
cmd /c "schtasks /Run /TN $TaskApp >nul 2>&1"
Write-Host '   برنامه در حال اجرای دوباره ...' -ForegroundColor DarkGray

# ---------- ۳) دریافت Caddy ----------
Write-Host '-> ۳) دریافت وب‌سرور HTTPS (Caddy) از منبع رسمی ...' -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $Tools | Out-Null
cmd /c "schtasks /End /TN $TaskProxy >nul 2>&1"
cmd /c "taskkill /F /IM caddy.exe >nul 2>&1"
$caddyExe = "$Tools\caddy.exe"
$caddyOk = Get-File @('https://caddyserver.com/api/download?os=windows&arch=amd64') $caddyExe 30000000
if (-not $caddyOk) {
    Write-Host '   منبع اول ناموفق بود — تلاش با ریلیز رسمی گیت‌هاب (zip) ...' -ForegroundColor DarkGray
    $caddyZip = "$Tools\caddy.zip"
    if (Get-File @('https://github.com/caddyserver/caddy/releases/download/v2.11.9/caddy_2.11.9_windows_amd64.zip') $caddyZip 15000000) {
        try { Expand-Archive -Path $caddyZip -DestinationPath $Tools -Force } catch {}
        if ((Test-Path $caddyExe) -and (Get-Item $caddyExe).Length -gt 30MB) { $caddyOk = $true }
    }
}
if (-not $caddyOk) {
    Write-Host 'خطا: دریافت Caddy از همهٔ منبع‌ها ناموفق بود. خروجی همین صفحه را کامل کپی و ارسال کنید.' -ForegroundColor Red
    return
}
Write-Host "OK  Caddy دریافت شد ($('{0:N0}' -f (Get-Item $caddyExe).Length) بایت)" -ForegroundColor Cyan

# ---------- ۴) پیکربندی Caddy و سرویس خودکار ----------
Write-Host '-> ۴) ساخت پیکربندی HTTPS و سرویس خودکار ...' -ForegroundColor Yellow
$caddyfile = @"
{
    admin off
}

$Domain {
    encode gzip
    reverse_proxy 127.0.0.1:$AppPort
}
"@
[System.IO.File]::WriteAllText("$Root\Caddyfile", ($caddyfile -replace "`r`n", "`n"))

$runCaddy = @"
@echo off
rem auto-generated by fix-https.ps1
cd /d $Root
:loop
"$Tools\caddy.exe" run --config "$Root\Caddyfile" >> "$Logs\caddy.log" 2>&1
timeout /t 5 /nobreak >nul
goto loop
"@
[System.IO.File]::WriteAllText("$Root\run-caddy.cmd", $runCaddy)

$restartCaddy = @"
@echo off
schtasks /End /TN "$TaskProxy" >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
schtasks /Run /TN "$TaskProxy" >nul 2>&1
echo Caddy restarted.
"@
[System.IO.File]::WriteAllText("$Root\restart-caddy.cmd", $restartCaddy)

schtasks /Create /F /TN $TaskProxy /TR "$Root\run-caddy.cmd" /SC ONSTART /RU SYSTEM /RL HIGHEST
cmd /c "schtasks /Run /TN $TaskProxy"
Write-Host 'OK  سرویس HTTPS اجرا شد — صدور گواهی ۱ تا ۳ دقیقه طول می‌کشد' -ForegroundColor Cyan

# ---------- ۵) بررسی سلامت ----------
Write-Host '-> ۵) بررسی سلامت (حداکثر ۹۰ ثانیه) ...' -ForegroundColor Yellow
$okApp = $false
foreach ($i in 1..30) {
    Start-Sleep -Seconds 3
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$AppPort/" -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $okApp = $true; break }
    } catch {}
}
if ($okApp) { Write-Host 'OK  برنامه روی پورت 3003 پاسخ می‌دهد' -ForegroundColor Cyan }
else { Write-Host 'هشدار: برنامه هنوز پاسخ نمی‌دهد — لاگ: C:\uastemdad\logs\app.log | راه‌اندازی دوباره: C:\uastemdad\restart-app.cmd' -ForegroundColor Yellow }

Write-Host '--- پورت‌های در حال شنیدن (باید 0.0.0.0:3003 و بعداً :80 و :443 دیده شوند) ---'
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 80, 443, 3003 } |
    Select-Object LocalAddress, LocalPort, OwningProcess |
    Sort-Object LocalPort | Format-Table -AutoSize

if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    Write-Host '--- تست از خود سرور ---'
    & curl.exe -s -o NUL -w "   برنامه (3003) = %{http_code}`n" "http://127.0.0.1:$AppPort/"
    & curl.exe -s -o NUL -w "   HTTP  (80)    = %{http_code}  (باید 308 باشد — ریدایرکت به HTTPS)`n" "http://127.0.0.1/" -H "Host: $Domain"
    & curl.exe -sk -o NUL -w "   HTTPS (443)   = %{http_code}  (اگر 000 است، گواهی هنوز صادر نشده)`n" "https://127.0.0.1/" -H "Host: $Domain"
}

Start-Sleep -Seconds 20
Write-Host '--- آخر لاگ HTTPS (Caddy) — اگر خطای certificate یا timeout دیدید، همین بخش را ارسال کنید ---'
if (Test-Path "$Logs\caddy.log") { Get-Content "$Logs\caddy.log" -Tail 30 }

Write-Host ''
Write-Host '================================================' -ForegroundColor Green
Write-Host '  کار تمام شد — حالا این‌ها را امتحان کنید:'      -ForegroundColor Green
Write-Host '================================================' -ForegroundColor Green
Write-Host "  ۱) http://${ServerIP}:$AppPort   ← دسترسی مستقیم (باید همین حالا باز شود)" -ForegroundColor Yellow
Write-Host "  ۲) https://$Domain             ← آدرس اصلی با HTTPS (۱ تا ۳ دقیقه صبر کنید)" -ForegroundColor Yellow
Write-Host '  پنل مدیریت:  https://uastemdad.ir/admin   ورود: admin / admin123'
Write-Host ''
Write-Host '  اگر http://94.182.131.94:3003 از کامپیوتر خودتان باز شد ولی https://uastemdad.ir'
Write-Host '  باز نشد: یعنی فایروال دیتاسنتر/شرکت ارائه‌دهندهٔ سرور پورت‌های 80 و 443 را بسته است؛'
Write-Host '  باید از پنل مدیریت سرور یا پشتیبانی هاستینگ این دو پورت باز شود.'
Write-Host '  اگر هیچ‌کدام باز نشد، خروجی کامل همین صفحه را ارسال کنید.'
Write-Host ''
