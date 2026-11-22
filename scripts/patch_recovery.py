#!/usr/bin/env python3
"""Patch update-app.ps1: restart BOTH tasks (app + Caddy) after update and
add an HTTPS health check, so an update never leaves the domain dead again."""
from pathlib import Path

P = Path('/home/z/my-project/update-app.ps1')
s = P.read_bytes().decode('utf-8')  # keeps BOM as \ufeff
CRLF = '\r\n'
assert '$TaskProxy' not in s, 'already patched'

# --- A) settings block: add ToolsDir / TaskProxy / Domain ---
reps = [
    ('$LogsDir  = "$Root\\logs"',
     '$LogsDir  = "$Root\\logs"' + CRLF + '$ToolsDir = "$Root\\tools"'),
    ('$TaskApp  = "uastemdad-app"',
     '$TaskApp   = "uastemdad-app"' + CRLF + '$TaskProxy = "uastemdad-proxy"'),
    ('$AppPort  = 3003',
     '$AppPort   = 3003' + CRLF + '$Domain    = "uastemdad.ir"'),
]

proxy_block = (
    '# Caddy (HTTPS) هم باید بالا بیاید — بعد از -Stop یا تعمیرات ممکن است خاموش مانده باشد' + CRLF +
    'if (Test-Path "$ToolsDir\\caddy.exe") {' + CRLF +
    '    $proxyExists = (schtasks /Query /TN $TaskProxy 2>$null) -ne $null' + CRLF +
    '    if ($proxyExists) {' + CRLF +
    '        Write-Host "-> راه‌اندازی HTTPS (Caddy) ..." -ForegroundColor Yellow' + CRLF +
    '        cmd /c "schtasks /Run /TN $TaskProxy >nul 2>&1"' + CRLF +
    '    }' + CRLF +
    '}' + CRLF + CRLF
)

# --- B) insert proxy start before section 10 ---
reps.append(('# ---------------------- ۱۰) بررسی سلامت ----------------------',
             proxy_block + '# ---------------------- ۱۰) بررسی سلامت ----------------------'))

# --- C) add HTTPS check after the local health loop ---
reps.append((
    '    } catch { Start-Sleep -Seconds 3 }' + CRLF + '}' + CRLF + CRLF + 'Write-Host ""' + CRLF +
    'Write-Host "================================================"',
    '    } catch { Start-Sleep -Seconds 3 }' + CRLF + '}' + CRLF + CRLF +
    '# بررسی HTTPS دامنه (غیرمانع‌ساز — فقط اطلاع)' + CRLF +
    '$okHttps = $false' + CRLF +
    'for ($i = 0; $i -lt 10; $i++) {' + CRLF +
    '    try {' + CRLF +
    '        $r = Invoke-WebRequest -UseBasicParsing -Uri "https://$Domain/" -TimeoutSec 8' + CRLF +
    '        if ($r.StatusCode -eq 200) { $okHttps = $true; break }' + CRLF +
    '    } catch { Start-Sleep -Seconds 3 }' + CRLF + '}' + CRLF + CRLF +
    'Write-Host ""' + CRLF + CRLF +
    'Write-Host "================================================"'))

# --- D) final panel: conditional site line ---
reps.append((
    'Write-Host "  سایت:           $siteUrl"',
    'if ($okLocal -and $okHttps) {' + CRLF +
    '    Write-Host "  سایت:           https://$Domain  — در دسترس ✓"                -ForegroundColor Green' + CRLF +
    '} elseif ($okLocal) {' + CRLF +
    '    Write-Host "  سایت:           https://$Domain — هنوز در دسترس نیست؛ چند دقیقه بعد دوباره چک کنید:" -ForegroundColor Yellow' + CRLF +
    '    Write-Host "                  start-app.ps1   |   لاگ Caddy: $LogsDir\\caddy.log" -ForegroundColor Yellow' + CRLF +
    '} else {' + CRLF +
    '    Write-Host "  سایت:           $siteUrl"' + CRLF + '}'))

for old, new in reps:
    assert s.count(old) == 1, f'anchor not unique ({s.count(old)}): {old[:60]!r}'
    s = s.replace(old, new)

# comment header update
s = s.replace('#     ۵) سلامت برنامه را روی پورت 3003 بررسی می‌کند',
              '#     ۵) برنامه و HTTPS (Caddy) را دوباره راه‌اندازی و سلامتِ پورت 3003 و دامنه را بررسی می‌کند')

P.write_bytes(s.encode('utf-8'))
print('update-app.ps1 patched OK')
