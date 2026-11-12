import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** مدیریت اعضا توسط ادمین: فهرست / تغییر وضعیت / حذف */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const items = await db.member.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { studentId: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  try {
    const body = await req.json();
    const id = String(body.id || "");
    const status = String(body.status || "");
    if (!id || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 400 });
    }
    await db.member.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "خطا در به‌روزرسانی" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 400 });
  await db.member.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
