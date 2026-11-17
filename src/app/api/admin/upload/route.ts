import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** پوشهٔ ذخیرهٔ فایل‌ها — در production با UPLOAD_DIR خارج از .next تنظیم می‌شود */
export function uploadsDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 });
    }
    const ext = ALLOWED[file.type as keyof typeof ALLOWED];
    if (!ext) {
      return NextResponse.json(
        { error: "فرمت فایل مجاز نیست (تصویر یا PDF)" },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "حجم فایل باید کمتر از ۱۰ مگابایت باشد" },
        { status: 400 }
      );
    }
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { writeFile, mkdir } = await import("fs/promises");
    const dir = uploadsDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (e) {
    console.error("upload error", e);
    return NextResponse.json({ error: "خطا در آپلود فایل" }, { status: 500 });
  }
}
