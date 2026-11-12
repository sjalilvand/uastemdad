import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getMemberSession } from "@/lib/member-auth";

export const dynamic = "force-dynamic";

/** اطلاعات عضو جاری */
export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const member = await db.member.findUnique({ where: { id: session.mid } });
  if (!member) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { passwordHash: _ph, ...safe } = member;
  return NextResponse.json({ member: safe });
}

/** ویرایش پروفایل، گذرواژه و وضعیت خبرنامه */
export async function PATCH(req: NextRequest) {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const member = await db.member.findUnique({ where: { id: session.mid } });
    if (!member) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 20);
    if (typeof body.field === "string") data.field = body.field.trim().slice(0, 80);
    if (typeof body.degree === "string") data.degree = body.degree.trim().slice(0, 60);
    if (typeof body.university === "string") data.university = body.university.trim().slice(0, 120);
    if (typeof body.newsletter === "boolean") data.newsletter = body.newsletter;

    if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
      if (body.newPassword.length < 6) {
        return NextResponse.json({ error: "گذرواژه باید حداقل ۶ کاراکتر باشد" }, { status: 400 });
      }
      const current = String(body.currentPassword || "");
      if (!verifyPassword(current, member.passwordHash)) {
        return NextResponse.json({ error: "گذرواژه فعلی نادرست است" }, { status: 400 });
      }
      data.passwordHash = hashPassword(body.newPassword);
    }

    // همگام‌سازی خبرنامه
    if (body.newsletter === true) {
      await db.newsletterSubscriber.upsert({
        where: { email: member.email },
        update: { isActive: true },
        create: { email: member.email, name: `${member.firstName} ${member.lastName}` },
      });
    } else if (body.newsletter === false) {
      await db.newsletterSubscriber.updateMany({
        where: { email: member.email },
        data: { isActive: false },
      });
    }

    await db.member.update({ where: { id: member.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("member update error", e);
    return NextResponse.json({ error: "خطا در ذخیره تغییرات" }, { status: 500 });
  }
}
