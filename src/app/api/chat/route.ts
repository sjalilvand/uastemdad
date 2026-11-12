import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { localAnswer, buildKnowledgeItems } from "@/lib/chat-local";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** بازیابی تاریخچه گفتگوی یک نشست */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session") || "";
  if (!sessionId) return NextResponse.json({ messages: [] });
  const rows = await db.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json({
    messages: rows.map((r) => ({ role: r.role, content: r.content })),
  });
}

/** ساخت بستر دانش از روی دیتابیس سامانه (برای سرویس هوش مصنوعی) */
async function buildKnowledge(): Promise<string> {
  const { items, basics } = await buildKnowledgeItems();

  const lines: string[] = [];
  lines.push("== اطلاعات پایه ==");
  lines.push(`نام سایت: ${basics.siteName}`);
  lines.push(`ریاست مرکز: ${basics.president}`);
  lines.push(`آدرس: ${basics.address}`);
  lines.push(`تلفن‌ها: ${basics.phones}`);
  lines.push(`ایمیل: ${basics.email}`);
  lines.push(`درباره مرکز: ${basics.aboutText}`);
  lines.push(`آمار: ${basics.stats}`);

  const groups: Record<string, typeof items> = {};
  for (const it of items) {
    const g = it.extra || "سایر";
    (groups[g] ||= []).push(it);
  }
  for (const [g, list] of Object.entries(groups)) {
    lines.push(`\n== ${g} ==`);
    for (const it of list.slice(0, 14)) {
      lines.push(`- «${it.title}»: ${it.text.replace(/\s+/g, " ").slice(0, 280)} | ${it.link}`);
    }
  }

  return lines.join("\n");
}

/** فراخوانی سرویس هوش مصنوعی با مهلت زمانی — در خطا null برمی‌گردد */
async function callAI(
  messages: { role: "assistant" | "user"; content: string }[]
): Promise<string | null> {
  try {
    const zai = await Promise.race([
      ZAI.create(),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("init timeout")), 8000)
      ),
    ]);
    const completion = await Promise.race([
      zai.chat.completions.create({
        messages,
        thinking: { type: "disabled" },
      }),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("ai timeout")), 25000)
      ),
    ]);

    const reply =
      (
        completion as {
          choices?: { message?: { content?: string } }[];
        }
      )?.choices?.[0]?.message?.content?.trim();
    return reply || null;
  } catch (e) {
    console.error(
      "AI unavailable, using local answer:",
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "").slice(0, 100);
    const message = String(body.message || "").trim().slice(0, 2000);
    const locale = ["fa", "en", "ar"].includes(body.locale) ? body.locale : "fa";
    if (!sessionId || !message) {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    // ذخیره پیام کاربر
    await db.chatMessage
      .create({ data: { sessionId, role: "user", content: message } })
      .catch(() => null);

    const [knowledge, history] = await Promise.all([
      buildKnowledge().catch(() => ""),
      db.chatMessage
        .findMany({ where: { sessionId }, orderBy: { createdAt: "desc" }, take: 11 })
        .catch(() => []),
    ]);

    let reply: string | null = null;

    if (knowledge) {
      const languageRule =
        locale === "en"
          ? "2) Always answer in English, polite, short and practical. Use bullets and numbering for readability."
          : locale === "ar"
            ? "2) أجب دائماً باللغة العربية، بأدب وإيجاز وعملية. استخدم النقاط والترقيم لسهولة القراءة."
            : "2) همیشه به زبان فارسی، محترمانه، کوتاه و کاربردی پاسخ بده. از بولت و شماره‌گذاری برای خوانایی استفاده کن.";

      const systemPrompt = `تو «دستیار هوشمند» سامانه رسمی مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره) هستی.
قواعد پاسخ‌دهی:
1) فقط بر اساس «دانش سامانه» زیر پاسخ بده و اطلاعات خلاف آن نساز. اگر پاسخ در دانش موجود نبود، صادقانه بگو اطلاعات دقیقی نداری و کاربر را به تماس تلفنی یا فرم ارتباط با مرکز راهنمایی کن.
${languageRule}
3) برای اخبار و اطلاعیه‌ها فقط از فهرست داده‌شده استفاده کن و تاریخ‌ها را همان‌طور که هستند بگو.
4) سؤالات عمومی و غیرمرتبط را کوتاه و مؤدبانه بی‌پاسخ بگذار و کاربر را به موضوعات سامانه برگردان.
5) سامانه «عضویت دانشجویان» در آدرس /membership برای ثبت‌نام و ورود اعضا در دسترس است و خبرنامه سایت در پاورقی فعال است.
6) پاسخ‌های خودت را بیش از ۱۵۰ کلمه نکن مگر اینکه کاربر جزئیات بخواهد.

== دانش سامانه ==
${knowledge}`;

      const orderedHistory = [...history].reverse();
      const messages: { role: "assistant" | "user"; content: string }[] = [
        { role: "assistant", content: systemPrompt },
      ];
      for (const h of orderedHistory.slice(0, -1)) {
        if (h.role === "user" || h.role === "assistant") {
          messages.push({ role: h.role, content: h.content });
        }
      }
      messages.push({ role: "user", content: message });

      reply = await callAI(messages);
    }

    let source: "ai" | "local" = "ai";
    if (!reply) {
      source = "local";
      reply = await localAnswer(message, locale);
    }

    await db.chatMessage
      .create({ data: { sessionId, role: "assistant", content: reply } })
      .catch(() => null);

    return NextResponse.json({ reply, source });
  } catch (e) {
    console.error("chat error", e);
    // حتی در خطای کلی، پاسخ محلی تلاش می‌شود تا کاربر هرگز پیام خطا نبیند
    try {
      const body = await req.json().catch(() => ({}));
      const message = String(body.message || "").trim();
      const locale = ["fa", "en", "ar"].includes(body.locale) ? body.locale : "fa";
      if (message) {
        const reply = await localAnswer(message, locale);
        return NextResponse.json({ reply, source: "local" });
      }
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      {
        reply:
          "در حال حاضر امکان پاسخ‌دهی نیست؛ لطفاً بعداً تلاش کنید یا با مرکز تماس بگیرید.",
        source: "local",
      },
      { status: 200 }
    );
  }
}
