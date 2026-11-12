import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getDelegate, sanitizeBody } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { resource } = await params;
  const entry = getDelegate(resource);
  if (!entry) {
    return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  }
  try {
    let items;
    if (resource === "posts") {
      items = await entry.delegate.findMany({
        orderBy: entry.orderBy,
        include: { category: true },
      });
    } else if (resource === "menus") {
      items = await entry.delegate.findMany({
        orderBy: entry.orderBy,
        include: { parent: { select: { label: true } } },
      });
    } else {
      items = await entry.delegate.findMany({ orderBy: entry.orderBy });
    }
    return NextResponse.json({ items });
  } catch (e) {
    console.error("admin list error", e);
    return NextResponse.json({ error: "خطا در دریافت داده‌ها" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { resource } = await params;
  const entry = getDelegate(resource);
  if (!entry) {
    return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  }
  try {
    const body = await req.json();
    let data = sanitizeBody(entry.def, body, { partial: false });
    if (entry.beforeSave) data = entry.beforeSave(data) as typeof data;
    const item = await entry.delegate.create({ data });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error("admin create error", e);
    const msg = e instanceof Error && e.message.includes("Unique")
      ? "رکوردی با این نامک یا نام قبلاً ثبت شده است"
      : "خطا در ایجاد رکورد";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
