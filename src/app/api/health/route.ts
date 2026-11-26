/**
 * نقطهٔ بررسی سلامت سامانه — توسط «پایشگر» (اسکریپت monitor-app.ps1) و
 * ابزارهای بیرونی هر دقیقه صدا زده می‌شود.
 *
 * خروجی: اگر دیتابیس سالم باشد 200 + {"ok":true,...} و اگر دیتابیس پاسخ
 * ندهد 503 + {"ok":false,...}. پایشگر بر اساس همین وضعیت، راه‌اندازی
 * خودکار و پیام به بات بله را انجام می‌دهد.
 *
 * نکتهٔ امنیتی: هیچ اطلاعات محرمانه‌ای (توکن، مسیر دیتابیس، آمار کاربران)
 * در خروجی نیست — فقط وضعیت کلی و اعداد عملیاتی.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pollerStatus } from "@/lib/bale/poller";
import { monitorStatus } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  let dbOk = true;
  let dbError = "";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    dbOk = false;
    dbError = e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120);
  }

  const mon = monitorStatus();
  const payload = {
    ok: dbOk,
    ts: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    db: dbOk ? "ok" : "error",
    dbError,
    bot: pollerStatus().running ? "running" : "stopped",
    memMb: Math.round(process.memoryUsage().rss / 1048576),
    monitor: {
      enabled: mon.enabled,
      lastTickAt: mon.lastTickAt,
      lastDbOk: mon.lastDbOk,
    },
    latencyMs: Date.now() - startedAt,
  };

  return NextResponse.json(payload, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
