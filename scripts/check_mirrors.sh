#!/bin/bash
# Check egress + Caddy mirror availability + server ports
echo "=== sandbox egress sanity ==="
timeout 10 bash -c "echo > /dev/tcp/github.com/443" 2>/dev/null && echo "github.com:443 OPEN" || echo "github.com:443 FAIL"

echo "=== user server ports (from this vantage) ==="
for p in 3389 3003 80 443; do
  timeout 12 bash -c "echo > /dev/tcp/94.182.131.94/$p" 2>/dev/null && echo "94.182.131.94:$p OPEN" || echo "94.182.131.94:$p CLOSED/FILTERED"
done

echo "=== mirror HEAD checks (first 1KB) ==="
urls=(
"https://caddyserver.com/api/download?os=windows&arch=amd64"
"https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_windows_amd64.exe"
"https://mirror.ghproxy.com/https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_windows_amd64.exe"
"https://gh-proxy.com/https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_windows_amd64.exe"
"https://ghfast.top/https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_windows_amd64.exe"
"https://github.moeyy.xyz/https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_windows_amd64.exe"
"https://ghproxy.net/https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_windows_amd64.exe"
"https://codeload.github.com/caddyserver/caddy/zip/refs/tags/v2.8.4"
)
for u in "${urls[@]}"; do
  code=$(curl -m 25 -sL -o /dev/null -w "%{http_code} size:%{size_download} url:%{url_effective}" -r 0-1000 "$u" 2>/dev/null)
  echo "$code  <-  $u"
done
