import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** آمار عمومی بازدید برای نمایش در پاورقی (کش ۶۰ ثانیه) */
export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [today, total, online] = await Promise.all([
      db.visit.count({ where: { createdAt: { gte: startOfToday } } }),
      db.visit.count(),
      db.visit
        .groupBy({ by: ["visitorId"], where: { createdAt: { gte: fiveMinAgo } } })
        .then((r) => r.length),
    ]);

    return NextResponse.json(
      { today, total, online },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch {
    return NextResponse.json({ today: 0, total: 0, online: 0 });
  }
}
