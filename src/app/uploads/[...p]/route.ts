import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { uploadsDir } from "@/app/api/admin/upload/route";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  txt: "text/plain; charset=utf-8",
};

/** سرو فایل‌های آپلودشده از UPLOAD_DIR (در production پوشهٔ data/uploads سرور) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ p: string[] }> }
) {
  const { p } = await params;
  if (!p || p.length === 0) {
    return new NextResponse("یافت نشد", { status: 404 });
  }
  const base = path.resolve(uploadsDir());
  const filePath = path.resolve(base, p.join("/"));
  // جلوگیری از پیمایش مسیر (path traversal)
  if (!filePath.startsWith(base + path.sep)) {
    return new NextResponse("یافت نشد", { status: 404 });
  }
  try {
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return new NextResponse("یافت نشد", { status: 404 });
  }
}
