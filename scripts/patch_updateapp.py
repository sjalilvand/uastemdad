# -*- coding: utf-8 -*-
"""update-app.ps1: add missing BALE_BOT_TOKEN warning to the final panel (CRLF-safe)."""
p = "/home/z/my-project/update-app.ps1"
d = open(p, "rb").read().decode("utf-8-sig")

anchor = ('Write-Host "  \u0646\u06a9\u062a\u0647: \u0628\u0627\u062a \u0628\u0644\u0647 \u0647\u0645\u0631\u0627\u0647 '
          '\u0628\u0627 \u062e\u0648\u062f\u0650 \u0628\u0631\u0646\u0627\u0645\u0647 \u0628\u0627\u0644\u0627 \u0645\u06cc\u200c\u0622\u06cc\u062f '
          '(polling \u062f\u0627\u062e\u0644 \u0633\u0631\u0648\u0631)." -ForegroundColor White\r\n')
ins = (
    'if (-not $baleToken) {\r\n'
    '    Write-Host "  \u0647\u0634\u062f\u0627\u0631: BALE_BOT_TOKEN \u062f\u0631 .env \u062a\u0646\u0638\u06cc\u0645 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a \u2014 \u0628\u0627\u062a \u0628\u0644\u0647 \u062e\u0627\u0645\u0648\u0634 \u0645\u06cc\u200c\u0645\u0627\u0646\u062f!" -ForegroundColor Red\r\n'
    '    Write-Host "  \u062a\u0646\u0638\u06cc\u0645 \u062a\u0648\u06a9\u0646:     powershell -ExecutionPolicy Bypass -File $App\\set-bot-token.ps1" -ForegroundColor Yellow\r\n'
    '}\r\n'
)
assert d.count(anchor) == 1, "anchor count = %d" % d.count(anchor)
d = d.replace(anchor, anchor + ins)
open(p, "wb").write(b"\xef\xbb\xbf" + d.encode("utf-8"))
print("patched update-app.ps1 ok")
