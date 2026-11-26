# ============================================================================
#   پایشگر سامانه (Watchdog) — مرکز علمی-کاربردی | uastemdad.ir
# ============================================================================
#   این اسکریپت توسط وظیفهٔ زمان‌بندی «uastemdad-monitor» هر ۱ دقیقه اجرا می‌شود
#   (نصب: powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\install-monitor.ps1)
#
#   کارهایی که انجام می‌دهد:
#     ۱) سلامت برنامه:  http://127.0.0.1:3003/api/health  → باید 200 + ok:true بدهد
#     ۲) اگر برنامه دان بود: تا ۳ بار به‌صورت خودکار ری‌استارتش می‌کند
#        (وظیفهٔ uastemdad-app — همان سازوکار update-app.ps1)
#     ۳) اگر بعد از ۳ تلاش هنوز دان بود: پیام هشدار به بات بله می‌فرستد
#        (به‌همراه ۱۵ خط آخر لاگ برای تشخیص علت)
#     ۴) سلامت HTTPS:  https://uastemdad.ir/api/health  → اگر ۳ بار پشت‌سرهم
#        پاسخ نداد، Caddy را ری‌استارت می‌کند و نتیجه را خبر می‌دهد
#     ۵) فضای دیسک C: → اگر کمتر از ۲ گیگابایت ماند، هشدار می‌دهد
#     ۶) همهٔ اتفاقات در C:\uastemdad\logs\monitor.log ثبت می‌شود
#
#   پیام‌های بات به کجا می‌رود؟
#     • پیام «بالا آمدن / مدت قطعی» از درون خودِ برنامه به همهٔ مدیرانِ بات
#       ارسال می‌شود (مانیتور داخلی — همان باتِ خبررسانی).
#     • پیام‌های «دان است و راه‌اندازی خودکار ناموفق بود» و هشدارهای HTTPS و
#       دیسک، مستقیم از همین اسکریپت فرستاده می‌شوند؛ برای این کار باید
#       MONITOR_CHAT_ID در فایل .env ست شده باشد:
#         ۱) در بات دستور /status بزنید → «شناسهٔ گفتگوی شما» را کپی کنید
#         ۲) powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\set-monitor-chat.ps1 -ChatId <شناسه>
#
#   حالت‌های دستی:
#     ... monitor-app.ps1 -Test        ← نمایش وضعیت + ارسال پیام آزمایشی به بات
#     ... monitor-app.ps1 -NoRestart   ← فقط هشدار، بدون راه‌اندازی مجدد (عیب‌یابی)
#
#   قفلِ نگهداری: وقتی update-app.ps1 یا «start-app.ps1 -Stop» در جریان است،
#   فایل logs\maintenance.lock ساخته می‌شود؛ پایشگر تا ۲۰ دقیقه کاری نمی‌کند
#   تا وسط به‌روزرسانی، برنامه را بالا نیاورد.
# ============================================================================

param(
    [switch]$Test,
    [switch]$NoRestart
)

$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ------------------------------ تنظیمات ------------------------------
$Root      = "C:\uastemdad"
$App       = "$Root\app"
$LogsDir   = "$Root\logs"
$EnvFile   = "$App\.env"
$StateFile = "$LogsDir\monitor-state.json"
$LockFile  = "$LogsDir\maintenance.lock"
$LogFile   = "$LogsDir\monitor.log"
$TaskApp   = "uastemdad-app"
$TaskProxy = "uastemdad-proxy"
$AppPort   = 3003
$Domain    = "uastemdad.ir"

$MaxRestartAttempts  = 3     # حداکثر راه‌اندازی مجدد خودکار در هر قطعی
$LockStaleMinutes    = 20    # قفل نگهداری قدیمی‌تر از این مدت نادیده گرفته می‌شود
$HttpsFailThreshold  = 3     # چند شکست متوالی HTTPS = مشکل واقعی
$HttpsFixCooldownMin = 30    # فاصلهٔ حداقلی بین دو ری‌استارت خودکار Caddy
$DiskWarnGb          = 2     # حد هشدار فضای خالی دیسک
$DiskWarnGapHours    = 12    # فاصلهٔ حداقلی بین دو هشدار دیسک
$RestartWaitSec      = 120   # چند ثانیه پس از ری‌استارت، منتظر بالا آمدن بمانیم

# ------------------------------ ابزارها ------------------------------
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Log([string]$msg) {
    $line = "{0} | {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    try { [System.IO.File]::AppendAllText($LogFile, $line + "`r`n", $Utf8NoBom) } catch {}
    try { Write-Host $line } catch {}
}

function Read-EnvMap {
    $map = @{}
    try {
        if (Test-Path $EnvFile) {
            foreach ($line in Get-Content $EnvFile -Encoding UTF8 -ErrorAction SilentlyContinue) {
                if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
                    $map[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
                }
            }
        }
    } catch {}
    return $map
}

# نویسه‌های غیر ASCII را به \uXXXX تبدیل می‌کند تا JSON در PowerShell 5.1 خراب نشود
function ConvertTo-JsonSafe([string]$s) {
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $s.ToCharArray()) {
        $c = [int]$ch
        if ($c -gt 127) { [void]$sb.Append(('\u{0:x4}' -f $c)) } else { [void]$sb.Append($ch) }
    }
    return $sb.ToString()
}

function Send-Bale([string]$text) {
    if (-not $script:BaleToken -or -not $script:MonitorChatId) {
        Write-Log "پیام بله ارسال نشد — BALE_BOT_TOKEN یا MONITOR_CHAT_ID در .env تنظیم نشده است"
        return $false
    }
    $script:LastBaleError = ""
    if ($text.Length -gt 3800) { $text = $text.Substring(0, 3800) }
    try {
        $body = ConvertTo-Json @{ chat_id = $script:MonitorChatId; text = $text; parse_mode = "HTML" } -Compress
        $body = ConvertTo-JsonSafe $body
        $res = Invoke-RestMethod -Method Post -Uri "https://tapi.bale.ai/bot$($script:BaleToken)/sendMessage" -ContentType "application/json; charset=utf-8" -Body $body -TimeoutSec 20
        if ($res.ok) { Write-Log "OK  پیام بله ارسال شد"; return $true }
        $script:LastBaleError = [string]$res.description
        Write-Log ("ارسال پیام بله ناموفق: {0}" -f $script:LastBaleError)
        return $false
    } catch {
        $script:LastBaleError = $_.Exception.Message
        Write-Log ("ارسال پیام بله خطا: {0}" -f $script:LastBaleError)
        if ($script:LastBaleError -match '404') {
            Write-Log "راهنما: خطای ۴۰۴ یعنی این شناسهٔ گفتگو (MONITOR_CHAT_ID) در بله وجود ندارد — احتمالاً شناسهٔ نمونه/اشتباه ثبت شده. در بات دستور /status بزنید و عدد واقعی را با set-monitor-chat.ps1 ثبت کنید."
        } elseif ($script:LastBaleError -match '401') {
            Write-Log "راهنما: خطای ۴۰۱ یعنی توکن بات (BALE_BOT_TOKEN) نامعتبر است — set-bot-token.ps1 را اجرا کنید."
        }
        return $false
    }
}

function Test-HealthUrl([string]$url, [int]$timeoutSec) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec $timeoutSec
        if ($r.StatusCode -eq 200 -and $r.Content -match '"ok"\s*:\s*true') { return $true }
        return $false
    } catch { return $false }
}

function Tail-Text([string]$path, [int]$n) {
    try {
        $lines = @(Get-Content $path -Tail $n -Encoding UTF8 -ErrorAction SilentlyContinue)
        $txt = ($lines -join "`n")
        if ($txt -and $txt.Length -gt 700) { $txt = "..." + $txt.Substring($txt.Length - 700) }
        return $txt
    } catch { return "" }
}

function Get-State {
    try {
        if (Test-Path $StateFile) {
            $s = Get-Content $StateFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($s) { return $s }
        }
    } catch {}
    return [pscustomobject]@{
        status = "up"; downSince = ""; restartCount = 0; notifiedDown = $false
        httpsFails = 0; httpsNotified = $false; lastHttpsFix = ""; lastDiskWarn = ""
    }
}

function Save-State($s) {
    try {
        $json = ConvertTo-Json $s -Compress
        [System.IO.File]::WriteAllText($StateFile, $json, $Utf8NoBom)
    } catch {}
}

function Reset-State($s) {
    $s.status = "up"; $s.downSince = ""; $s.restartCount = 0; $s.notifiedDown = $false
    return $s
}

function Restart-App {
    Write-Log "-> ری‌استارت برنامه (وظیفهٔ $TaskApp) ..."
    cmd /c "schtasks /End /TN $TaskApp >nul 2>&1"
    cmd /c "taskkill /F /IM node.exe >nul 2>&1"
    Start-Sleep -Seconds 3
    cmd /c "schtasks /Run /TN $TaskApp >nul 2>&1"
}

function Restart-Caddy {
    Write-Log "-> ری‌استارت HTTPS/Caddy (وظیفهٔ $TaskProxy) ..."
    cmd /c "schtasks /End /TN $TaskProxy >nul 2>&1"
    cmd /c "taskkill /F /IM caddy.exe >nul 2>&1"
    Start-Sleep -Seconds 3
    cmd /c "schtasks /Run /TN $TaskProxy >nul 2>&1"
}

function Wait-Healthy([int]$seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HealthUrl "http://127.0.0.1:$AppPort/api/health" 6) { return $true }
        Start-Sleep -Seconds 5
    }
    return $false
}

function Test-FreshLock([string]$path, [int]$staleMinutes) {
    if (-not (Test-Path $path)) { return $false }
    try {
        $age = ((Get-Date) - (Get-Item $path).LastWriteTime).TotalMinutes
        return ($age -ge 0 -and $age -lt $staleMinutes)
    } catch { return $false }
}

# ------------------------------ حالت آزمایش ------------------------------
function Show-Test {
    Write-Host ""
    Write-Host "=================== وضعیت پایش سامانه ===================" -ForegroundColor Green

    $local = Test-HealthUrl "http://127.0.0.1:$AppPort/api/health" 6
    Write-Host ("  برنامه (پورت {0})        : {1}" -f $AppPort, $(if ($local) { "سالم ✓" } else { "پاسخ نمی‌دهد ✗" })) -ForegroundColor $(if ($local) { "Green" } else { "Red" })

    $https = Test-HealthUrl "https://$Domain/api/health" 10
    Write-Host ("  سایت https://$Domain : {0}" -f $(if ($https) { "سالم ✓" } else { "پاسخ نمی‌دهد ✗" })) -ForegroundColor $(if ($https) { "Green" } else { "Yellow" })

    try {
        $c = Get-PSDrive C
        Write-Host ("  فضای خالی دیسک C:       : {0:N1} GB" -f ($c.Free / 1GB)) -ForegroundColor Yellow
    } catch {}

    foreach ($t in @($TaskApp, $TaskProxy, "uastemdad-monitor")) {
        $exists = (schtasks /Query /TN $t 2>$null) -ne $null
        Write-Host ("  وظیفهٔ زمان‌بندی {0,-20}: {1}" -f $t, $(if ($exists) { "موجود ✓" } else { "نصب نشده ✗ (install-monitor.ps1)" })) -ForegroundColor $(if ($exists) { "Green" } else { "Yellow" })
    }

    if (Test-FreshLock $LockFile $LockStaleMinutes) {
        Write-Host "  قفل نگهداری (به‌روزرسانی/توقف دستی): فعال — پایشگر موقتاً غیرفعال است" -ForegroundColor Yellow
    }

    if (Test-Path $LogFile) {
        Write-Host ""
        Write-Host "  ---------- ۱۰ خط آخر لاگ پایش ----------" -ForegroundColor DarkGray
        Get-Content $LogFile -Tail 10 -Encoding UTF8 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }

    Write-Host ""
    if ($script:BaleToken -and $script:MonitorChatId) {
        Write-Host "-> ارسال پیام آزمایشی به بات بله ..." -ForegroundColor Yellow
        $sent = Send-Bale ("✅ <b>پیام آزمایشی پایش</b>`nاگر این پیام را می‌بینید، اطلاع‌رسانی دان/بالا آمدن سامانه فعال است.`n🏫 uastemdad.ir — زمان: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
        if ($sent) {
            Write-Host "OK  پیام آزمایشی ارسال شد — در بله چک کنید" -ForegroundColor Green
        } else {
            if ("$script:LastBaleError" -match "404") {
                Write-Host "خطا: شناسهٔ گفتگو نامعتبر است (۴۰۴ = این گفتگو در بله پیدا نشد)." -ForegroundColor Red
                Write-Host "  اگر MONITOR_CHAT_ID = 123456789 است، همان عدد نمونهٔ مستندات بود!" -ForegroundColor Yellow
                Write-Host "  در بات بله دستور /status بزنید ← «شناسهٔ گفتگوی شما» را کپی کنید و دوباره" -ForegroundColor Yellow
                Write-Host "  set-monitor-chat.ps1 -ChatId <عدد واقعی> را اجرا کنید." -ForegroundColor Yellow
            } elseif ("$script:LastBaleError" -match "401") {
                Write-Host "خطا: توکن بات نامعتبر است (۴۰۱) — set-bot-token.ps1 را اجرا کنید." -ForegroundColor Red
            } else {
                Write-Host ("ارسال ناموفق: {0}" -f $script:LastBaleError) -ForegroundColor Red
                Write-Host "  اتصال اینترنت سرور به tapi.bale.ai را هم می‌توانید چک کنید." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  پیام مستقیم پایشگر غیرفعال است (MONITOR_CHAT_ID تنظیم نشده)." -ForegroundColor Yellow
        Write-Host "  ۱) در بات بله دستور /status بزنید → «شناسهٔ گفتگوی شما» را کپی کنید" -ForegroundColor Yellow
        Write-Host "  ۲) اجرا: powershell -ExecutionPolicy Bypass -File $App\set-monitor-chat.ps1 -ChatId <شناسه>" -ForegroundColor Yellow
        Write-Host "  توجه: پیام «بالا آمدن و مدت قطعی» به‌هرحال از درون برنامه به مدیرانِ بات ارسال می‌شود." -ForegroundColor White
    }
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
}

# ------------------------------ اجرای اصلی ------------------------------
# جلوگیری از اجرای هم‌زمان دو نمونه (وظیفهٔ هر دقیقه + اجرای دستی)
$mutexOk = $false
$mutex = $null
try { $mutex = New-Object System.Threading.Mutex($true, "Global\uastemdad-monitor", [ref]$mutexOk) } catch { $mutexOk = $true }
if (-not $mutexOk) { exit 0 }

try {
    New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

    # خواندن تنظیمات از .env
    $envMap = Read-EnvMap
    $script:BaleToken = ""
    $script:MonitorChatId = ""
    if ($envMap.ContainsKey("BALE_BOT_TOKEN"))   { $script:BaleToken = $envMap["BALE_BOT_TOKEN"] }
    if ($envMap.ContainsKey("MONITOR_CHAT_ID"))  { $script:MonitorChatId = $envMap["MONITOR_CHAT_ID"] }
    if ($envMap.ContainsKey("SITE_URL") -and $envMap["SITE_URL"].Trim()) {
        $d = ($envMap["SITE_URL"].Trim() -replace '^https?://', '' -replace '/+$', '')
        if ($d) { $Domain = $d }
    }
    $HttpsUrl = "https://$Domain/api/health"

    if ($Test) { Show-Test; return }

    # ---- قفلِ نگهداری: وسط به‌روزرسانی/توقف دستی دخالت نکن ----
    if (Test-FreshLock $LockFile $LockStaleMinutes) {
        Write-Log "قفل نگهداری فعال است (به‌روزرسانی/توقف دستی) — این دور رد شد"
        return
    }

    # ---- ۱) سلامت برنامه ----
    $appUp = Test-HealthUrl "http://127.0.0.1:$AppPort/api/health" 6
    if (-not $appUp) { Start-Sleep -Seconds 4; $appUp = Test-HealthUrl "http://127.0.0.1:$AppPort/api/health" 6 }

    $st = Get-State

    if ($appUp) {
        # --- برنامه سالم است ---
        $wasDown = ($st.status -ne "up")
        if ($wasDown) { Write-Log "OK  برنامه دوباره سالم شد" }
        if ($wasDown -and $st.notifiedDown) {
            Send-Bale "🟢 <b>سامانهٔ uastemdad.ir دوباره بالا آمد</b>`n(پس از اقدام پایشگر — گزارش کامل قطعی از درون برنامه هم ارسال می‌شود)"
        }
        $st = Reset-State $st
        Save-State $st
    } else {
        # --- برنامه پاسخ نمی‌دهد ---
        if ($st.status -ne "down") {
            $st.status = "down"; $st.downSince = (Get-Date).ToString("o")
            $st.restartCount = 0; $st.notifiedDown = $false
            Save-State $st
        }
        $downMin = 0
        if ($st.downSince) {
            try { $ds = [datetime]::Parse($st.downSince, [System.Globalization.CultureInfo]::InvariantCulture); $downMin = [int]((Get-Date) - $ds).TotalMinutes } catch {}
        }
        Write-Log ("برنامه پاسخ نمی‌دهد (≈ {0} دقیقه)" -f $downMin)

        if ($NoRestart) {
            Write-Log "حالت NoRestart: راه‌اندازی مجدد انجام نشد — فقط هشدار"
            return
        }

        if ([int]$st.restartCount -ge $MaxRestartAttempts) {
            if (-not $st.notifiedDown) {
                $tail = Tail-Text "$LogsDir\app.log" 15
                $msg = (
                    "🔴 <b>سامانهٔ uastemdad.ir دان است</b>`n" +
                    "راه‌اندازی خودکار {0} بار تلاش کرد و ناموفق بود — اقدام دستی لازم است.`n`n" +
                    "اقدام سریع روی سرور:`n" +
                    "powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\start-app.ps1 -Restart`n`n" +
                    "چک‌لیست عیب‌یابی و راهنمای کامل: پوشهٔ docs در کد برنامه`n`n" +
                    "۱۵ خط آخر لاگ برنامه:`n{1}"
                ) -f $MaxRestartAttempts, $tail
                Send-Bale $msg
                $st.notifiedDown = $true; Save-State $st
            }
            return
        }

        $st.restartCount = [int]$st.restartCount + 1
        Save-State $st
        Write-Log ("راه‌اندازی مجدد خودکار — تلاش {0} از {1}" -f $st.restartCount, $MaxRestartAttempts)
        Restart-App
        if (Wait-Healthy $RestartWaitSec) {
            Write-Log "OK  برنامه پس از راه‌اندازی خودکار بالا آمد"
            $st = Reset-State $st
            Save-State $st
        } else {
            Write-Log "راه‌اندازی مجدد ناموفق بود"
            if ([int]$st.restartCount -ge $MaxRestartAttempts -and -not $st.notifiedDown) {
                $tail = Tail-Text "$LogsDir\app.log" 15
                $msg = (
                    "🔴 <b>سامانهٔ uastemdad.ir دان است</b>`n" +
                    "راه‌اندازی خودکار {0} بار تلاش کرد و ناموفق بود — اقدام دستی لازم است.`n`n" +
                    "اقدام سریع روی سرور:`n" +
                    "powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\start-app.ps1 -Restart`n`n" +
                    "۱۵ خط آخر لاگ برنامه:`n{1}"
                ) -f $MaxRestartAttempts, $tail
                Send-Bale $msg
                $st.notifiedDown = $true; Save-State $st
            }
        }
    }

    # ---- ۲) سلامت HTTPS (فقط وقتی برنامه سالم است) ----
    $httpsOk = Test-HealthUrl $HttpsUrl 10
    if (-not $httpsOk) { Start-Sleep -Seconds 3; $httpsOk = Test-HealthUrl $HttpsUrl 10 }

    if ($httpsOk) {
        if ([int]$st.httpsFails -gt 0 -or $st.httpsNotified) { Write-Log "OK  HTTPS دوباره در دسترس است" }
        $st.httpsFails = 0; $st.httpsNotified = $false; Save-State $st
    } else {
        $st.httpsFails = [int]$st.httpsFails + 1
        Save-State $st
        Write-Log ("HTTPS پاسخ نمی‌دهد (شکست متوالی: {0})" -f $st.httpsFails)

        if ([int]$st.httpsFails -ge $HttpsFailThreshold) {
            $cooldownOk = $true
            if ($st.lastHttpsFix) {
                try {
                    $ageMin = ((Get-Date) - [datetime]::Parse($st.lastHttpsFix, [System.Globalization.CultureInfo]::InvariantCulture)).TotalMinutes
                    if ($ageMin -lt $HttpsFixCooldownMin) { $cooldownOk = $false }
                } catch {}
            }
            if ($cooldownOk) {
                $st.lastHttpsFix = (Get-Date).ToString("o"); Save-State $st
                Restart-Caddy
                Start-Sleep -Seconds 20
                if (Test-HealthUrl $HttpsUrl 10) {
                    $st.httpsFails = 0; $st.httpsNotified = $false; Save-State $st
                    Write-Log "OK  HTTPS پس از ری‌استارت Caddy سالم شد"
                    Send-Bale "🟠 مشکل HTTPS سامانه به‌صورت خودکار رفع شد (Caddy ری‌استارت شد)."
                } elseif (-not $st.httpsNotified) {
                    $st.httpsNotified = $true; Save-State $st
                    Send-Bale (
                        "🟠 <b>برنامه سالم است اما HTTPS در دسترس نیست</b>`n" +
                        "ری‌استارت Caddy هم کمک نکرد — اقدام دستی:`n" +
                        "powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\fix-https.ps1`n" +
                        "لاگ: Get-Content C:\uastemdad\logs\caddy.log -Tail 30"
                    )
                }
            } elseif (-not $st.httpsNotified) {
                $st.httpsNotified = $true; Save-State $st
                Send-Bale (
                    "🟠 <b>HTTPS در دسترس نیست</b> (برنامه سالم است)`n" +
                    "اقدام دستی: powershell -ExecutionPolicy Bypass -File C:\uastemdad\app\fix-https.ps1"
                )
            }
        }
    }

    # ---- ۳) فضای دیسک ----
    try {
        $c = Get-PSDrive C
        $freeGb = [math]::Round($c.Free / 1GB, 1)
        $warnNow = $true
        if ($st.lastDiskWarn) {
            try {
                $ageH = ((Get-Date) - [datetime]::Parse($st.lastDiskWarn, [System.Globalization.CultureInfo]::InvariantCulture)).TotalHours
                if ($ageH -lt $DiskWarnGapHours) { $warnNow = $false }
            } catch {}
        }
        if ($freeGb -lt $DiskWarnGb -and $warnNow) {
            $st.lastDiskWarn = (Get-Date).ToString("o"); Save-State $st
            Write-Log ("هشدار دیسک: فقط {0} GB خالی است" -f $freeGb)
            $msg = (
                "🟡 <b>فضای دیسک سرور کم است</b>: فقط {0} GB خالی مانده`n" +
                "وقتی دیسک پر شود دیتابیس خراب می‌شود — لاگ‌های قدیمی C:\uastemdad\logs را پاک کنید."
            ) -f $freeGb
            Send-Bale $msg
        }
    } catch {}
} finally {
    if ($mutex) {
        try { $mutex.ReleaseMutex() } catch {}
        try { $mutex.Dispose() } catch {}
    }
}
