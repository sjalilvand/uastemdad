import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** آمار تفصیلی بازدید برای پنل مدیریت */
export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const [today, week, month, total, uniques, online, topPages, browsers, oses, devices, recent] =
    await Promise.all([
      db.visit.count({ where: { createdAt: { gte: startOfToday } } }),
      db.visit.count({ where: { createdAt: { gte: weekAgo } } }),
      db.visit.count({ where: { createdAt: { gte: monthAgo } } }),
      db.visit.count(),
      db.visit.groupBy({ by: ["visitorId"] }).then((r) => r.length),
      db.visit
        .groupBy({ by: ["visitorId"], where: { createdAt: { gte: fiveMinAgo } } })
        .then((r) => r.length),
      db.visit.groupBy({ by: ["path"], _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 10 }),
      db.visit.groupBy({ by: ["browser"], _count: { _all: true }, orderBy: { _count: { browser: "desc" } } }),
      db.visit.groupBy({ by: ["os"], _count: { _all: true }, orderBy: { _count: { os: "desc" } } }),
      db.visit.groupBy({ by: ["device"], _count: { _all: true }, orderBy: { _count: { device: "desc" } } }),
      db.visit.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

  // سری روزانه ۱۴ روز اخیر (با کوئری پرسیج ساده)
  const dailyRows = await db.visit.findMany({
    where: { createdAt: { gte: twoWeeksAgo } },
    select: { createdAt: true },
  });
  const dailyMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  for (const row of dailyRows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
  }
  const dailySeries = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    today,
    week,
    month,
    total,
    uniques,
    online,
    dailySeries,
    topPages: topPages.map((p) => ({ path: p.path, count: p._count._all })),
    browsers: browsers.map((b) => ({ name: b.browser, count: b._count._all })),
    oses: oses.map((o) => ({ name: o.os, count: o._count._all })),
    devices: devices.map((d) => ({ name: d.device, count: d._count._all })),
    recent: recent.map((r) => ({
      id: r.id,
      path: r.path,
      browser: r.browser,
      os: r.os,
      device: r.device,
      referrer: r.referrer,
      createdAt: r.createdAt,
    })),
  });
}
