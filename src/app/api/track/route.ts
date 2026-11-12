import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** کش جست‌وجوی جغرافیایی IP (۱ روز) */
const geoCache = new Map<string, { country: string; city: string; at: number }>();
const GEO_TTL = 24 * 3600 * 1000;

/** آیا IP خصوصی/لوکال است؟ */
function isPrivateIp(ip: string): boolean {
  return (
    !ip ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80")
  );
}

/** استخراج IP واقعی کاربر از هدرها */
function extractIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    ""
  );
}

/** جست‌وجوی کشور و شهر از سرویس رایگان ip-api (با مهلت کوتاه و کش) */
async function geoLookup(ip: string): Promise<{ country: string; city: string }> {
  if (!ip || isPrivateIp(ip)) return { country: "شبکه محلی", city: "" };
  const hit = geoCache.get(ip);
  if (hit && Date.now() - hit.at < GEO_TTL) {
    return { country: hit.country, city: hit.city };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city&lang=fa`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      city?: string;
    };
    const out =
      data.status === "success"
        ? { country: data.country || "", city: data.city || "" }
        : { country: "", city: "" };
    geoCache.set(ip, { ...out, at: Date.now() });
    // محدودسازی اندازهٔ کش
    if (geoCache.size > 5000) {
      const firstKey = geoCache.keys().next().value;
      if (firstKey) geoCache.delete(firstKey);
    }
    return out;
  } catch {
    return { country: "", city: "" };
  }
}

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

    const ip = extractIp(req);
    const { country, city } = await geoLookup(ip);

    await db.visit.create({
      data: {
        visitorId,
        path: path.slice(0, 200),
        title: String(body.title || "").slice(0, 200),
        browser,
        os,
        device,
        referrer,
        ip: ip.slice(0, 60),
        country: country.slice(0, 60),
        city: city.slice(0, 60),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track error", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
