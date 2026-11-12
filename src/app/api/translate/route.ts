import { NextResponse } from "next/server";
import { translateBatch, isTargetLocale } from "@/lib/translate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ترجمهٔ آنلاین متن — برای استفادهٔ داخلی سایت
 * POST { texts: string[], target: "en" | "ar" }
 * → { translations: string[] } (ناموفق‌ها همان متن اصلی برمی‌گردند)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { texts?: unknown; target?: unknown };
    const texts = Array.isArray(body.texts)
      ? body.texts.filter((t): t is string => typeof t === "string")
      : [];
    const target = typeof body.target === "string" ? body.target : "";
    if (!texts.length || !isTargetLocale(target)) {
      return NextResponse.json(
        { error: "texts (array) و target (en|ar) الزامی است" },
        { status: 400 }
      );
    }
    const total = texts.reduce((a, t) => a + t.length, 0);
    if (total > 200_000) {
      return NextResponse.json({ error: "حجم متن بیش از حد مجاز است" }, { status: 413 });
    }
    const map = await translateBatch(texts, target);
    return NextResponse.json({
      translations: texts.map((t) => map.get(t.trim()) || t),
    });
  } catch {
    return NextResponse.json({ error: "خطا در ترجمه" }, { status: 500 });
  }
}
