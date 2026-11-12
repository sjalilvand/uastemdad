import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** تشخیص مرورگر و سیستم‌عامل از User-Agent */
function parseUA(ua: string): { browser: string; os: string; device: string } {
  const s = ua || "";
  let browser = "دیگر";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/samsungbrowser/i.test(s)) browser = "Samsung Internet";
  else if (/chrome|crios/i.test(s)) browser = "Chrome";
  else if (/firefox|fxios/i.test(s)) browser = "Firefox";
  else if (/safari/i.test(s)) browser = "Safari";
  else if (/bot|crawler|spider|curl|wget|headless/i.test(s)) browser = "ربات";

  let os = "دیگر";
  if (/windows nt/i.test(s)) os = "Windows";
  else if (/android/i.test(s)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(s)) os = "iOS";
  else if (/mac os x|macintosh/i.test(s)) os = "macOS";
  else if (/linux/i.test(s)) os = "Linux";

  const device = /mobile|android|iphone/i.test(s)
    ? "mobile"
    : /ipad|tablet/i.test(s)
      ? "tablet"
      : "desktop";
  return { browser, os, device };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body.path || "/").slice(0, 300);
    // مسیرهای غیرعمومی ثبت نمی‌شوند
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }
    const ua = req.headers.get("user-agent") || "";
    const { browser, os, device } = parseUA(ua);
    // ربات‌ها شمارش نمی‌شوند
    if (browser === "ربات") return NextResponse.json({ ok: true });

    const visitorId = String(body.visitorId || "anonymous").slice(0, 80);
    const referrerRaw = String(body.referrer || "").slice(0, 300);
    // منبع ورود فقط برای دامنه‌های دیگر
    let referrer = "";
    try {
      if (referrerRaw) {
        const u = new URL(referrerRaw);
        if (u.hostname !== req.headers.get("host")) referrer = u.hostname;
      }
    } catch {
      referrer = "";
    }

    await db.visit.create({
      data: {
        visitorId,
        path: path.slice(0, 200),
        title: String(body.title || "").slice(0, 200),
        browser,
        os,
        device,
        referrer,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track error", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
