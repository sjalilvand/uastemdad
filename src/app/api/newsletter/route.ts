import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** عضویت در خبرنامه (عمومی) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
    const name = String(body.name || "").trim().slice(0, 80);
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "ایمیل معتبر نیست" }, { status: 400 });
    }
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: { isActive: true, name: name || undefined },
      create: { email, name },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("newsletter error", e);
    return NextResponse.json({ error: "خطا در ثبت عضویت" }, { status: 500 });
  }
}

/** فهرست مشترکان (ادمین) */
export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const items = await db.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}
