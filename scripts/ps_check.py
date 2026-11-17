#!/usr/bin/env python3
"""Lightweight PowerShell syntax sanity checker:
balanced braces/parens, balanced quotes, properly closed here-strings.
Not a full parser, but catches the common breakages."""
import sys

def check(path):
    with open(path, 'rb') as f:
        raw = f.read()
    bom = raw.startswith(b'\xef\xbb\xbf')
    text = raw.decode('utf-8-sig').replace('\r\n', '\n')
    lines = text.split('\n')
    i = 0  # line index
    col = 0
    depth = 0       # {}
    paren = 0       # ()
    brackets = 0    # []
    line_no = 1
    ok = True
    problems = []

    def err(msg):
        problems.append(f'{path}:{line_no}: {msg}')

    while i < len(lines):
        line = lines[i]
        line_no = i + 1
        col = 0
        n = len(line)
        # check here-string closing at start of line
        while col < n:
            c = line[col]
            nxt = line[col + 1] if col + 1 < n else ''
            # block comment
            if c == '<' and nxt == '#':
                end = line.find('#>', col + 2)
                if end == -1:
                    # skip until closing
                    j = i
                    while j < len(lines) and '#>' not in lines[j]:
                        j += 1
                    i = j
                    line = lines[i] if i < len(lines) else ''
                    line_no = i + 1
                    col = line.find('#>') + 2 if '#>' in line else len(line)
                    if col >= len(line):
                        break
                    continue
                else:
                    col = end + 2
                    continue
            if c == '#':
                break  # rest of line is comment
            if c == '@' and nxt == '"':
                # here-string double-quoted opener: @" (must be at end of line)
                if line[col:].strip() != '@"':
                    err('here-string header @" not alone on line')
                i += 1
                while i < len(lines) and not lines[i].startswith('"@'):
                    i += 1
                if i >= len(lines):
                    err('unterminated double here-string')
                    ok = False
                i += 1  # skip closing line
                line_no = i
                col = 0
                n = len(lines[i]) if i < len(lines) else 0
                line = lines[i] if i < len(lines) else ''
                continue
            if c == '@' and nxt == "'":
                # here-string single-quoted opener: @' (must be at end of line)
                if line[col:].strip() != "@'":
                    err("here-string header @' not alone on line")
                i += 1
                while i < len(lines) and not lines[i].startswith("'@"):
                    i += 1
                if i >= len(lines):
                    err("unterminated single here-string")
                    ok = False
                i += 1  # skip closing line
                line_no = i
                col = 0
                n = len(lines[i]) if i < len(lines) else 0
                line = lines[i] if i < len(lines) else ''
                continue
            if c == "'":
                # single-quoted string
                col += 1
                while col < n:
                    if line[col] == "'":
                        if col + 1 < n and line[col + 1] == "'":
                            col += 2
                            continue
                        break
                    col += 1
                if col >= n:
                    err('unterminated single-quoted string')
                    ok = False
                col += 1
                continue
            if c == '"':
                # double-quoted string with backtick escapes
                col += 1
                closed = False
                while col < n:
                    if line[col] == '`':
                        col += 2
                        continue
                    if line[col] == '"':
                        if col + 1 < n and line[col + 1] == '"':
                            col += 2
                            continue
                        closed = True
                        break
                    col += 1
                if not closed:
                    err('unterminated double-quoted string')
                    ok = False
                    break
                col += 1
                continue
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth < 0:
                    err('unbalanced }')
                    ok = False
            elif c == '(':
                paren += 1
            elif c == ')':
                paren -= 1
                if paren < 0:
                    err('unbalanced )')
                    ok = False
            elif c == '[':
                brackets += 1
            elif c == ']':
                brackets -= 1
            col += 1
        i += 1

    if depth != 0:
        problems.append(f'{path}: final brace depth = {depth}')
        ok = False
    if paren != 0:
        problems.append(f'{path}: final paren balance = {paren}')
        ok = False
    if brackets != 0:
        problems.append(f'{path}: final bracket balance = {brackets}')
        ok = False
    print(('SYNTAX OK  ' if ok else 'SYNTAX FAIL') + f'  {path}  (BOM={bom}, lines={len(lines)})')
    for p in problems:
        print('   ' + p)
    return ok

allok = all([check(p) for p in sys.argv[1:]])
sys.exit(0 if allok else 1)
