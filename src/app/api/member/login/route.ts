import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setMemberSession } from "@/lib/member-auth";

export const dynamic = "force-dynamic";

/** ورود عضو با شماره دانشجویی یا ایمیل */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!identifier || !password) {
      return NextResponse.json(
        { error: "اطلاعات ورود را کامل کنید" },
        { status: 400 }
      );
    }

    const member = await db.member.findFirst({
      where: { OR: [{ email: identifier }, { studentId: body.identifier || "" }] },
    });
    if (!member || !verifyPassword(password, member.passwordHash)) {
      return NextResponse.json(
        { error: "اطلاعات ورود نادرست است" },
        { status: 401 }
      );
    }
    if (member.status === "PENDING") {
      return NextResponse.json({ error: "PENDING" }, { status: 403 });
    }
    if (member.status === "REJECTED") {
      return NextResponse.json({ error: "REJECTED" }, { status: 403 });
    }

    await db.member.update({
      where: { id: member.id },
      data: { lastLoginAt: new Date() },
    });

    await setMemberSession({
      mid: member.id,
      name: `${member.firstName} ${member.lastName}`,
      email: member.email,
      status: member.status,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("member login error", e);
    return NextResponse.json({ error: "خطا در ورود" }, { status: 500 });
  }
}
