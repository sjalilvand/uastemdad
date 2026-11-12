import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getDelegate, sanitizeBody } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { resource, id } = await params;
  const entry = getDelegate(resource);
  if (!entry) {
    return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  }
  const item = await entry.delegate.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { resource, id } = await params;
  const entry = getDelegate(resource);
  if (!entry) {
    return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  }
  try {
    const body = await req.json();
    let data = sanitizeBody(entry.def, body, { partial: true });
    if (entry.beforeSave) data = entry.beforeSave(data) as typeof data;
    const item = await entry.delegate.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (e) {
    console.error("admin update error", e);
    const msg = e instanceof Error && e.message.includes("Unique")
      ? "رکوردی با این نامک یا نام قبلاً ثبت شده است"
      : "خطا در به‌روزرسانی رکورد";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { resource, id } = await params;
  const entry = getDelegate(resource);
  if (!entry) {
    return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  }
  try {
    await entry.delegate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin delete error", e);
    return NextResponse.json({ error: "خطا در حذف رکورد" }, { status: 400 });
  }
}
