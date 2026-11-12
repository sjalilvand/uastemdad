import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatJalali } from "@/lib/jalali";
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

/** ساخت بستر دانش از روی دیتابیس سامانه */
async function buildKnowledge(): Promise<string> {
  const [settings, news, announcements, programs, systems, pages, documents, links] =
    await Promise.all([
      getSettings(),
      db.post.findMany({
        where: { published: true, type: "NEWS" },
        orderBy: { publishedAt: "desc" },
        take: 12,
      }),
      db.post.findMany({
        where: { published: true, type: "ANNOUNCEMENT" },
        orderBy: { publishedAt: "desc" },
        take: 6,
      }),
      db.program.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      db.externalSystem.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      db.page.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
      db.document.findMany({ take: 20 }),
      db.relatedLink.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    ]);

  const lines: string[] = [];
  lines.push("== اطلاعات پایه ==");
  lines.push(`نام سایت: ${settings.siteName}`);
  lines.push(`ریاست مرکز: ${settings.presidentName}`);
  lines.push(`آدرس: ${settings.address}`);
  lines.push(`تلفن‌ها: ${settings.phones}`);
  lines.push(`ایمیل: ${settings.email}`);
  lines.push(`درباره مرکز: ${settings.aboutText}`);
  lines.push(
    `آمار: ${settings.statStudents} دانشجو، ${settings.statFaculty} عضو هیئت علمی، ${settings.statPrograms} رشته تحصیلی، ${settings.statBooks} جلد کتاب تألیفی`
  );

  if (programs.length) {
    lines.push("\n== رشته‌های تحصیلی ==");
    for (const p of programs) {
      lines.push(`- ${p.title} (${p.degree}): ${p.description}`);
    }
  }

  if (systems.length) {
    lines.push("\n== سامانه‌ها ==");
    for (const s of systems) {
      lines.push(`- ${s.title}: ${s.description} | آدرس: ${s.url}`);
    }
  }

  if (pages.length) {
    lines.push("\n== صفحات سایت ==");
    for (const p of pages) {
      const plain = p.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      lines.push(`- «${p.title}» (آدرس: /p/${p.slug}): ${plain.slice(0, 600)}`);
    }
  }

  if (news.length) {
    lines.push("\n== آخرین اخبار مرکز ==");
    for (const n of news) {
      lines.push(
        `- «${n.title}» — ${formatJalali(n.publishedAt)} — ${n.excerpt.replace(/\s+/g, " ").slice(0, 300)}`
      );
    }
  }

  if (announcements.length) {
    lines.push("\n== اطلاعیه‌ها ==");
    for (const a of announcements) {
      lines.push(`- «${a.title}» — ${formatJalali(a.publishedAt)} — ${a.excerpt.replace(/\s+/g, " ").slice(0, 300)}`);
    }
  }

  if (documents.length) {
    lines.push("\n== فرم‌ها و آیین‌نامه‌ها ==");
    const cats = [...new Set(documents.map((d) => d.category))];
    lines.push(`گروه‌ها: ${cats.join("، ")}`);
    for (const d of documents.slice(0, 10)) {
      lines.push(`- ${d.title} (گروه: ${d.category})${d.fileUrl ? ` | فایل: ${d.fileUrl}` : ""}`);
    }
  }

  if (links.length) {
    lines.push("\n== پیوندهای مرتبط ==");
    lines.push(links.map((l) => l.title).join("، "));
  }

  return lines.join("\n");
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
    await db.chatMessage.create({
      data: { sessionId, role: "user", content: message },
    });

    const [knowledge, history] = await Promise.all([
      buildKnowledge(),
      db.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: 11,
      }),
    ]);

    const languageRule =
      locale === "en"
        ? "2) Always answer in English, polite, short and practical. Use bullets and numbering for readability."
        : locale === "ar"
          ? "2) أجب دائماً باللغة العربية، بأدب وإيجاز وعملية. استخدم النقاط والترقيم لسهولة القراءة."
          : "2) همیشه به زبان فارسی، محترمانه، کوتاه و کاربردی پاسخ بده. از بولت و شماره‌گذاری برای خوانایی استفاده کن.";

    const systemPrompt = `تو «دستیار هوشمند» سامانه رسمی ${"مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره)"} هستی.
قواعد پاسخ‌دهی:
1) فقط بر اساس «دانش سامانه» زیر پاسخ بده و اطلاعات خلاف آن نساز. اگر پاسخ در دانش موجود نبود، صادقانه بگو اطلاعات دقیقی نداری و کاربر را به تماس تلفنی یا فرم ارتباط با مرکز راهنمایی کن.
${languageRule}
3) برای اخبار و اطلاعیه‌ها فقط از فهرست «آخرین اخبار» و «اطلاعیه‌ها» استفاده کن و تاریخ‌ها را همان‌طور که هستند بگو. اگر برای اخبار نسخهٔ انگلیسی یا عربی (فیلدهای En/Ar) در داده بود، در پاسخ انگلیسی/عربی از همان نسخه استفاده کن.
4) سؤالات عمومی و غیرمرتبط (مثلاً علوم عمومی) را کوتاه و مؤدبانه بی‌پاسخ بگذار و کاربر را به موضوعات سامانه برگردان.
5) اگر کاربر پرسید چطور در رشته‌ای ثبت‌نام کند، زمان‌های ثبت‌نام اطلاعیه ثبت‌نام را بگو و پیشنهاد کن با مرکز تماس بگیرد. سامانه «عضویت دانشجویان» در آدرس /membership برای ثبت‌نام و ورود اعضا در دسترس است و خبرنامه سایت در پاورقی فعال است.
6) پاسخ‌های خودت را بیش از ۱۵۰ کلمه نکن مگر اینکه کاربر جزئیات بخواهد.

== دانش سامانه ==
${knowledge}`;

    // ترتیب صحیح تاریخچه (قدیمی به جدید) بدون پیام فعلی تکراری
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

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      (locale === "en"
        ? "Answering is not available right now; please try again later or contact the center."
        : locale === "ar"
          ? "الإجابة غير متاحة حالياً؛ يرجى المحاولة لاحقاً أو التواصل مع المركز."
          : "در حال حاضر امکان پاسخ‌دهی نیست؛ لطفاً بعداً تلاش کنید یا با مرکز تماس بگیرید.");

    await db.chatMessage.create({
      data: { sessionId, role: "assistant", content: reply },
    });

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("chat error", e);
    return NextResponse.json(
      { reply: "خطا در پردازش درخواست؛ لطفاً دوباره تلاش کنید." },
      { status: 200 }
    );
  }
}
