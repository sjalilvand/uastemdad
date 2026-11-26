#!/usr/bin/env python3
"""Post-process the runbook docx per docx skill toc.md rules:
1) Map each section's footer via document.xml.rels and patch PAGE field
   instrText: section 2 (front matter) -> ROMAN, section 3 (body) -> arabic.
2) Remove empty <w:pgNumType/> emitted for the cover section.
"""
import re
import shutil
import sys
import zipfile
import tempfile
import os

path = sys.argv[1]
tmp = tempfile.mkdtemp()

with zipfile.ZipFile(path) as z:
    z.extractall(tmp)

doc_xml_path = os.path.join(tmp, "word", "document.xml")
rels_path = os.path.join(tmp, "word", "_rels", "document.xml.rels")
with open(doc_xml_path, encoding="utf-8") as f:
    doc = f.read()
with open(rels_path, encoding="utf-8") as f:
    rels = f.read()

# map rId -> footer file
rel_map = dict(re.findall(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="(footer\d+\.xml)"', rels))
rel_map.update({rid: t for t, rid in []})

# find sectPr blocks in order and their default footerReference
sect_blocks = re.findall(r"<w:sectPr[^>]*>.*?</w:sectPr>", doc, flags=re.S)
footers_by_index = []
for blk in sect_blocks:
    m = re.search(r'<w:footerReference w:type="default" r:id="([^"]+)"', blk)
    footers_by_index.append(rel_map.get(m.group(1)) if m else None)

print("sections found:", len(sect_blocks), "footers:", footers_by_index)

def patch_footer(fname, fmt):
    p = os.path.join(tmp, "word", fname)
    with open(p, encoding="utf-8") as f:
        xml = f.read()
    xml2, n = re.subn(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        r"\1 PAGE \\* " + fmt + r" \\* MERGEFORMAT \2",
        xml,
    )
    with open(p, "w", encoding="utf-8") as f:
        f.write(xml2)
    print(f"patched {fname} -> {fmt} ({n} fields)")

# section order: [cover(no footer), front matter(ROMAN), body(arabic)]
if len(footers_by_index) >= 3:
    if footers_by_index[1]:
        patch_footer(footers_by_index[1], "ROMAN")
    if footers_by_index[2]:
        patch_footer(footers_by_index[2], "arabic")
else:
    print("WARNING: expected 3 sections")

# remove empty pgNumType (cover section)
doc2, n = re.subn(r"<w:pgNumType/>", "", doc)
print("removed empty pgNumType:", n)

# remove leftover placeholder hyperlink inside the TOC field (right after the
# TOC field's separate fldChar) — docx-js emits one sample entry that
# duplicates the first heading in the static view
first_sep = doc2.find('w:fldCharType="separate"')
removed = 0
if first_sep != -1:
    window = doc2[first_sep:first_sep + 5000]
    m = re.search(r"<w:hyperlink[^>]*>.*?</w:hyperlink>", window, flags=re.S)
    if m and "PAGEREF" in m.group(0):
        doc2 = doc2[:first_sep] + window.replace(m.group(0), "", 1) + doc2[first_sep + 5000:]
        removed = 1
print("removed leftover TOC hyperlink entries:", removed)

with open(doc_xml_path, "w", encoding="utf-8") as f:
    f.write(doc2)

# rezip
out = path + ".new"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(tmp):
        for fn in files:
            full = os.path.join(root, fn)
            z.write(full, os.path.relpath(full, tmp))
shutil.move(out, path)
shutil.rmtree(tmp)
print("postprocess done:", path)
