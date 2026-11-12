import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** ثبت‌نام دانشجو — حساب با وضعیت «در انتظار تأیید» ساخته می‌شود */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const firstName = String(body.firstName || "").trim().slice(0, 60);
    const lastName = String(body.lastName || "").trim().slice(0, 60);
    const studentId = String(body.studentId || "").trim().slice(0, 40);
    const nationalId = String(body.nationalId || "").trim().slice(0, 20);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
    const phone = String(body.phone || "").trim().slice(0, 20);
    const field = String(body.field || "").trim().slice(0, 80);
    const degree = String(body.degree || "کارشناسی").trim().slice(0, 60);
    const university = String(body.university || "").trim().slice(0, 120);
    const password = String(body.password || "");
    const newsletter = body.newsletter !== false;

    if (!firstName || !lastName || !studentId || !email || password.length < 6) {
      return NextResponse.json(
        { error: "تکمیل نام، نام خانوادگی، شماره دانشجویی، ایمیل و گذرواژه (حداقل ۶ کاراکتر) الزامی است" },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "ایمیل معتبر نیست" }, { status: 400 });
    }

    const dupStudent = await db.member.findUnique({ where: { studentId } });
    if (dupStudent) {
      return NextResponse.json(
        { error: "این شماره دانشجویی قبلاً ثبت شده است" },
        { status: 409 }
      );
    }
    const dupEmail = await db.member.findUnique({ where: { email } });
    if (dupEmail) {
      return NextResponse.json(
        { error: "این ایمیل قبلاً ثبت شده است" },
        { status: 409 }
      );
    }

    await db.member.create({
      data: {
        firstName,
        lastName,
        studentId,
        nationalId,
        email,
        phone,
        field,
        degree,
        university,
        passwordHash: hashPassword(password),
        newsletter,
        status: "PENDING",
      },
    });

    // عضویت خبرنامه در صورت علاقه
    if (newsletter) {
      await db.newsletterSubscriber.upsert({
        where: { email },
        update: { isActive: true },
        create: { email, name: `${firstName} ${lastName}` },
      });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("member register error", e);
    return NextResponse.json({ error: "خطا در ثبت‌نام" }, { status: 500 });
  }
}
