import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const message = String(body.message || "").trim();
    if (!name || !message) {
      return NextResponse.json(
        { error: "نام و متن پیام الزامی است" },
        { status: 400 }
      );
    }
    if (name.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: "طول پیام بیش از حد مجاز است" }, { status: 400 });
    }
    await db.contactMessage.create({
      data: {
        name,
        email: String(body.email || "").slice(0, 200),
        phone: String(body.phone || "").slice(0, 50),
        subject: String(body.subject || "").slice(0, 300),
        message,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
