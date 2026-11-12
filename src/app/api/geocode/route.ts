import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UA = "uastemdad-site/1.0 (university website; contact: info@uastemdad.ir)";

/**
 * تبدیل آدرس متنی (مبدأ) به مختصات با Nominatim/OpenStreetMap
 * GET /api/geocode?q=آدرس
 * → { results: [{ lat, lng, label }] }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q,
        format: "json",
        limit: "5",
        "accept-language": "fa",
      });
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      lat: string;
      lon: string;
      display_name: string;
      type?: string;
    }[];
    return NextResponse.json({
      results: data.slice(0, 5).map((d) => ({
        lat: Number(d.lat),
        lng: Number(d.lon),
        label: d.display_name,
      })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
