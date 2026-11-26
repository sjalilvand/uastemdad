# ============================================================================
#   راه‌اندازی / توقف / ری‌استارت / وضعیت سامانه — برای استفادهٔ روزمره
#
#   اجرای برنامه هر وقت لازم شد (PowerShell با Run as Administrator):
#     powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\start-app.ps1
#
#   حالت‌های دیگر:
#     ... start-app.ps1 -Status     ← فقط نمایش وضعیت (بدون تغییر)
#     ... start-app.ps1 -Restart    ← توقف کامل و راه‌اندازی دوباره
#     ... start-app.ps1 -Stop       ← توقف برنامه و HTTPS
#
#   این اسکریپت هر دو وظیفهٔ زمان‌بندی ویندوز را مدیریت می‌کند:
#     uastemdad-app   ← برنامهٔ Next.js روی پورت 3003 (+ بات بله)
#     uastemdad-proxy ← Caddy برای HTTPS دامنه (پورت 80 و 443)
# ============================================================================

param(
    [switch]$Restart,
    [switch]$Stop,
    [switch]$Status
)

$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ------------------------------ تنظیمات ------------------------------
$Root      = "C:\uastemdad"
$App       = "$Root\app"
$LogsDir   = "$Root\logs"
$ToolsDir  = "$Root\tools"
$TaskApp   = "uastemdad-app"
$TaskProxy = "uastemdad-proxy"
$AppPort   = 3003
$Domain    = "uastemdad.ir"

function Test-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "⚠️  بهتر است PowerShell را با Run as Administrator باز کنید؛ در غیر این صورت شاید وظایف اجرا نشوند." -ForegroundColor Yellow
    }
}

function Test-TaskExists([string]$name) {
    return (schtasks /Query /TN $name 2>$null) -ne $null
}

function Get-TaskState([string]$name) {
    try {
        $info = schtasks /Query /TN $name /FO LIST 2>$null | Out-String
        if ($info -match "Status:\s*(.+)") { return $Matches[1].Trim() }
    } catch {}
    return "NotFound"
}

function Test-PortListening([int]$port) {
    try {
        $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $c)
    } catch { return $false }
}

function Test-HttpOk([string]$url) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

function Stop-Everything {
    Write-Host "-> توقف برنامه و HTTPS ..." -ForegroundColor Yellow
    cmd /c "schtasks /End /TN $TaskApp >nul 2>&1"
    cmd /c "schtasks /End /TN $TaskProxy >nul 2>&1"
    cmd /c "taskkill /F /IM node.exe >nul 2>&1"
    cmd /c "taskkill /F /IM caddy.exe >nul 2>&1"
    Start-Sleep -Seconds 2
    # قفلِ نگهداری: پایشگر این توقفِ دستی را «قطعی» حساب نکند و دوباره بالا نیاورد.
    # (راه‌اندازی بعدی با همین اسکریپت، قفل را برمی‌دارد)
    New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
    [System.IO.File]::WriteAllText("$LogsDir\maintenance.lock", (Get-Date).ToString("o"))
    Write-Host "OK  همه متوقف شدند (پایشگر تا راه‌اندازی بعدی غیرفعال است)" -ForegroundColor Cyan
}

function Start-Services {
    Write-Host ""
    Write-Host "-> راه‌اندازی سامانه ..." -ForegroundColor Yellow
    # برداشتن قفلِ نگهداری (اگر از توقف قبلی مانده باشد) — پایشگر دوباره فعال می‌شود
    Remove-Item "$LogsDir\maintenance.lock" -ErrorAction SilentlyContinue

    # --- برنامهٔ اصلی ---
    if (-not (Test-TaskExists $TaskApp)) {
        Write-Host "خطا: وظیفهٔ '$TaskApp' وجود ندارد. اول استقرار را اجرا کنید:" -ForegroundColor Red
        Write-Host "     powershell -ExecutionPolicy Bypass -File $Root\deploy.ps1" -ForegroundColor Yellow
        return $false
    }
    $running = Get-TaskState $TaskApp
    if ($running -eq "Running") {
        Write-Host "OK  برنامه از قبل در حال اجراست ($TaskApp)" -ForegroundColor Cyan
    } else {
        schtasks /Run /TN $TaskApp | Out-Null
        Write-Host "OK  وظیفهٔ برنامه اجرا شد ($TaskApp)" -ForegroundColor Cyan
    }

    # --- HTTPS (Caddy) — اگر نصب باشد ---
    if (Test-Path "$ToolsDir\caddy.exe") {
        if (Test-TaskExists $TaskProxy) {
            $pState = Get-TaskState $TaskProxy
            if ($pState -eq "Running") {
                Write-Host "OK  HTTPS از قبل در حال اجراست ($TaskProxy)" -ForegroundColor Cyan
            } else {
                schtasks /Run /TN $TaskProxy | Out-Null
                Write-Host "OK  وظیفهٔ HTTPS اجرا شد ($TaskProxy)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "هشدار: وظیفهٔ HTTPS وجود ندارد — اجرای دستی: $Root\run-caddy.cmd" -ForegroundColor Yellow
            Write-Host "       یا اسکریپت تعمیر: powershell -ExecutionPolicy Bypass -File $App\fix-https.ps1" -ForegroundColor Yellow
        }
    } else {
        Write-Host "هشدار: caddy.exe پیدا نشد؛ سایت فعلاً روی http://127.0.0.1:$AppPort در دسترس است." -ForegroundColor Yellow
        Write-Host "       برای فعال‌سازی HTTPS: powershell -ExecutionPolicy Bypass -File $App\fix-https.ps1" -ForegroundColor Yellow
    }

    # --- بررسی سلامت ---
    Write-Host "-> بررسی سلامت (تا ۲ دقیقه) ..." -ForegroundColor Yellow
    $ok = $false
    foreach ($i in 1..40) {
        if (Test-HttpOk "http://127.0.0.1:$AppPort/") { $ok = $true; break }
        Start-Sleep -Seconds 3
    }
    if ($ok) {
        Write-Host "OK  برنامه روی پورت $AppPort در حال سرویس‌دهی است" -ForegroundColor Green
    } else {
        Write-Host "هشدار: برنامه هنوز پاسخ نمی‌دهد — لاگ را بررسی کنید:" -ForegroundColor Yellow
        Write-Host "       Get-Content $LogsDir\app.log -Tail 50" -ForegroundColor Yellow
        Write-Host "       راه‌اندازی دوباره: $Root\restart-app.cmd" -ForegroundColor Yellow
    }
    return $true
}

function Show-Status {
    Write-Host ""
    Write-Host "=================== وضعیت سامانه ===================" -ForegroundColor Green

    $aState = Get-TaskState $TaskApp
    Write-Host ("  وظیفهٔ برنامه  ($TaskApp)  : {0}" -f $aState) -ForegroundColor $(if ($aState -eq "Running") { "Green" } else { "Red" })

    if (Test-Path "$ToolsDir\caddy.exe") {
        $pState = Get-TaskState $TaskProxy
        Write-Host ("  وظیفهٔ HTTPS   ($TaskProxy) : {0}" -f $pState) -ForegroundColor $(if ($pState -eq "Running") { "Green" } else { "Red" })
    } else {
        Write-Host "  وظیفهٔ HTTPS   ($TaskProxy) : نصب نشده" -ForegroundColor Yellow
    }

    $p3003 = Test-PortListening $AppPort
    Write-Host ("  پورت {0} (برنامه)   : {1}" -f $AppPort, $(if ($p3003) { "باز ✓" } else { "بسته ✗" })) -ForegroundColor $(if ($p3003) { "Green" } else { "Red" })

    $p443 = Test-PortListening 443
    Write-Host ("  پورت 443 (HTTPS)   : {0}" -f $(if ($p443) { "باز ✓" } else { "بسته ✗" })) -ForegroundColor $(if ($p443) { "Green" } else { "Red" })

    $http = Test-HttpOk "http://127.0.0.1:$AppPort/"
    Write-Host ("  پاسخ‌دهی برنامه    : {0}" -f $(if ($http) { "سالم ✓" } else { "بدون پاسخ ✗" })) -ForegroundColor $(if ($http) { "Green" } else { "Red" })

    $https = Test-HttpOk "https://$Domain/"
    Write-Host ("  سایت https://$Domain : {0}" -f $(if ($https) { "در دسترس ✓" } else { "در دسترس نیست ✗" })) -ForegroundColor $(if ($https) { "Green" } else { "Yellow" })

    Write-Host ""
    Write-Host "  سایت:       https://$Domain" -ForegroundColor Yellow
    Write-Host "  پنل مدیریت: https://$Domain/admin" -ForegroundColor Yellow
    Write-Host "  بات بله:    ble.ir/Universityemdad_bot" -ForegroundColor Yellow

    if (Test-Path "$LogsDir\app.log") {
        Write-Host ""
        Write-Host "  ---------- ۵ خط آخر لاگ برنامه ----------" -ForegroundColor DarkGray
        Get-Content "$LogsDir\app.log" -Tail 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }
    Write-Host ""
    Write-Host "  لاگ زنده:  Get-Content $LogsDir\app.log -Wait -Tail 30" -ForegroundColor White
    Write-Host "====================================================" -ForegroundColor Green
    Write-Host ""
}

# ------------------------------ اجرا ------------------------------
Test-Admin

if ($Status) {
    Show-Status
    return
}
if ($Stop) {
    Stop-Everything
    Show-Status
    return
}
if ($Restart) {
    Stop-Everything
    [void](Start-Services)
    Show-Status
    return
}

# حالت پیش‌فرض: راه‌اندازی
[void](Start-Services)
Show-Status
