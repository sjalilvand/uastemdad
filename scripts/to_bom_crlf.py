#!/usr/bin/env python3
"""Convert PowerShell scripts to UTF-8 BOM + CRLF (Windows PowerShell 5.1 friendly)."""
import sys

for path in sys.argv[1:]:
    with open(path, 'rb') as f:
        data = f.read()
    if data.startswith(b'\xef\xbb\xbf'):
        data = data[3:]
    text = data.decode('utf-8')
    # normalize newlines then convert to CRLF
    text = text.replace('\r\n', '\n').replace('\n', '\r\n')
    with open(path, 'wb') as f:
        f.write(b'\xef\xbb\xbf' + text.encode('utf-8'))
    print(f'{path}: BOM+CRLF ok, {len(text)} chars')
