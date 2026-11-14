import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const rows = await db.setting.findMany();
  // مقادیر پیش‌فرض به‌عنوان پایه؛ ردیف‌های دیتابیس روی آن سوار می‌شوند
  // تا پنل مدیریت همیشه مقدارِ مؤثرِ فعلی را نشان دهد و ذخیرهٔ فرم،
  // مقادیر پیش‌فرض را با رشتهٔ خالی بازنویسی نکند
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  return NextResponse.json({ settings: map });
}

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const entries = Object.entries(body).filter(
      ([k]) => k && typeof k === "string" && k.length < 100
    );
    for (const [key, value] of entries) {
      await db.setting.upsert({
        where: { key },
        update: { value: String(value ?? "") },
        create: { key, value: String(value ?? "") },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "خطا در ذخیره تنظیمات" }, { status: 400 });
  }
}
