#!/bin/bash
echo "=== refused vs timeout check ==="
for p in 3003 80 443; do
  echo "--- port $p ---"
  curl -v --connect-timeout 12 -o /dev/null "http://94.182.131.94:$p/" 2>&1 | grep -E "Trying|refused|timed out|Failed|Unable" | head -5
done
echo
echo "=== reverse proxy latest release assets ==="
curl -s -m 20 https://api.github.com/repos/caddyserver/caddy/releases/latest | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('tag:', d['tag_name'])
for a in d['assets']:
    if 'windows' in a['name'].lower():
        print(' -', a['name'], a['size'])
"
