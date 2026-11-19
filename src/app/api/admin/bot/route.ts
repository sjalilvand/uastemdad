import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMe } from "@/lib/bale/api";
import { isBotConfigured, botEnabled, pollerStatus, startPoller, stopPoller } from "@/lib/bale/poller";

export const dynamic = "force-dynamic";

/** وضعیت بات، مدیران متصل و گزارش فعالیت */
export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const configured = isBotConfigured();
  const status = pollerStatus();
  let bot: { id?: number; username?: string; name?: string } | null = null;
  if (configured) {
    const me = await getMe();
    if (me.ok && me.result) {
      bot = { id: me.result.id, username: me.result.username, name: me.result.first_name };
    }
  }
  const [admins, logs, newsCount, annCount, draftCount, total] = await Promise.all([
    db.botAdmin.findMany({ orderBy: { createdAt: "desc" } }),
    db.botLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    db.post.count({ where: { type: "NEWS", source: "BALE" } }),
    db.post.count({ where: { type: "ANNOUNCEMENT", source: "BALE" } }),
    db.post.count({ where: { source: "BALE", published: false } }),
    db.post.count(),
  ]);
  return NextResponse.json({
    configured,
    enabled: botEnabled(),
    running: status.running,
    startedAt: status.startedAt,
    bot,
    admins,
    logs,
    stats: { newsCount, annCount, draftCount, total },
  });
}

/** ری‌استارت یا توقف polling */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action === "restart") {
    stopPoller();
    await new Promise((r) => setTimeout(r, 800));
    await startPoller();
    return NextResponse.json({ ok: true, message: "بات ری‌استارت شد" });
  }
  if (body.action === "stop") {
    stopPoller();
    return NextResponse.json({ ok: true, message: "بات متوقف شد" });
  }
  return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 });
}

/** غیرفعال‌سازی اتصال یک مدیر بله */
export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId الزامی است" }, { status: 400 });
  }
  await db.botAdmin.updateMany({ where: { chatId }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
