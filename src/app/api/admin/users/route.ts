import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const users = await db.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users, current: session.uid });
}

/** افزودن کاربر جدید */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const body = await req.json();
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  if (!username || !password || !name) {
    return NextResponse.json(
      { error: "همه فیلدها الزامی است" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "رمز عبور باید حداقل ۶ کاراکتر باشد" },
      { status: 400 }
    );
  }
  try {
    const user = await db.user.create({
      data: {
        username,
        name,
        passwordHash: hashPassword(password),
        role: "ADMIN",
        isActive: true,
      },
    });
    return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "نام کاربری تکراری است" },
      { status: 400 }
    );
  }
}

/** تغییر رمز / نام / وضعیت */
export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const body = await req.json();
  const id = String(body.id || "");
  const action = String(body.action || "");

  if (action === "changePassword") {
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "رمز جدید باید حداقل ۶ کاراکتر باشد" },
        { status: 400 }
      );
    }
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }
    if (user.id === session.uid) {
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json(
          { error: "رمز فعلی اشتباه است" },
          { status: 400 }
        );
      }
    }
    await db.user.update({
      where: { id },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "updateProfile") {
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }
    await db.user.update({ where: { id }, data: { name } });
    return NextResponse.json({ ok: true });
  }

  if (action === "toggleActive") {
    if (id === session.uid) {
      return NextResponse.json(
        { error: "نمی‌توانید حساب خود را غیرفعال کنید" },
        { status: 400 }
      );
    }
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }
    await db.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id") || "";
  if (id === session.uid) {
    return NextResponse.json(
      { error: "نمی‌توانید حساب خود را حذف کنید" },
      { status: 400 }
    );
  }
  const count = await db.user.count();
  if (count <= 1) {
    return NextResponse.json(
      { error: "حداقل یک کاربر باید باقی بماند" },
      { status: 400 }
    );
  }
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
