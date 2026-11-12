import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatJalali } from "@/lib/jalali";

/* ================================================================ */
/*  موتور پاسخ محلی گفتگو — زمانی که سرویس هوش مصنوعی در دسترس نیست  */
/*  بر پایهٔ تطبیق کلیدواژه‌ها روی داده‌های واقعی سامانه              */
/* ================================================================ */

export interface KnowledgeItem {
  title: string;
  text: string;
  link: string;
  extra?: string;
}

/** حذف کلمات پرتکرار بی‌معنا از پرسش */
const STOPWORDS = new Set([
  "از", "به", "با", "در", "که", "را", "و", "است", "هست", "بود", "شود", "کن", "کنم",
  "چه", "چی", "چیست", "کیست", "کدام", "کجاست", "کجا", "چطور", "چگونه", "چند",
  "من", "ما", "شما", "او", "این", "آن", "ها", "های", "برای", "تا", "هم", "نیز",
  "بگو", "بده", "میخوام", "می‌خوام", "میخواهم", "لطفا", "لطفاً", "سلام", "درود",
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "is", "are", "what",
  "how", "where", "when", "who", "which", "do", "does", "please", "tell", "me",
  "هل", "أين", "كيف",
]);

function tokenize(text: string): string[] {
  return String(text || "")
    .replace(/[<>«»()[\]{}.,،؛:!?؟'"=+\-*\\/|_#@$%^&~`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export async function buildKnowledgeItems(): Promise<{
  items: KnowledgeItem[];
  basics: {
    siteName: string; address: string; phones: string; email: string;
    aboutText: string; stats: string; president: string;
  };
}> {
  const [settings, news, announcements, programs, systems, pages, documents, faqs] =
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
      db.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    ]);

  const items: KnowledgeItem[] = [];

  for (const n of news) {
    items.push({
      title: n.title,
      text: `${n.excerpt} ${n.content.replace(/<[^>]*>/g, " ")}`.slice(0, 500),
      link: `/news/${n.slug}`,
      extra: `خبر — ${formatJalali(n.publishedAt)}`,
    });
  }
  for (const a of announcements) {
    items.push({
      title: a.title,
      text: `${a.excerpt} ${a.content.replace(/<[^>]*>/g, " ")}`.slice(0, 500),
      link: `/announcements/${a.slug}`,
      extra: `اطلاعیه — ${formatJalali(a.publishedAt)}`,
    });
  }
  for (const p of programs) {
    items.push({
      title: `رشتهٔ ${p.title} (${p.degree})`,
      text: p.description || `رشتهٔ تحصیلی ${p.title} در مقطع ${p.degree}`,
      link: "/programs",
      extra: "رشتهٔ تحصیلی",
    });
  }
  for (const s of systems) {
    items.push({
      title: s.title,
      text: `${s.description} آدرس سامانه: ${s.url}`,
      link: s.url,
      extra: "سامانه",
    });
  }
  for (const p of pages) {
    items.push({
      title: p.title,
      text: p.content.replace(/<[^>]*>/g, " ").slice(0, 500),
      link: `/p/${p.slug}`,
      extra: "صفحه",
    });
  }
  for (const d of documents) {
    items.push({
      title: d.title,
      text: `${d.description} (گروه: ${d.category})`,
      link: "/documents",
      extra: "فرم و آیین‌نامه",
    });
  }
  for (const f of faqs) {
    items.push({
      title: f.question,
      text: f.answer,
      link: "/faq",
      extra: "پرسش متداول",
    });
  }

  return {
    items,
    basics: {
      siteName: settings.siteName,
      address: settings.address,
      phones: settings.phones,
      email: settings.email,
      aboutText: settings.aboutText,
      stats: `${settings.statStudents} دانشجو، ${settings.statFaculty} عضو هیئت علمی، ${settings.statPrograms} رشته تحصیلی`,
      president: settings.presidentName,
    },
  };
}

/** پاسخ محلی بر اساس تطبیق کلیدواژه — همیشه یک پاسخ مفید برمی‌گرداند */
export async function localAnswer(
  message: string,
  locale: "fa" | "en" | "ar"
): Promise<string> {
  const { items, basics } = await buildKnowledgeItems();
  const q = message.toLowerCase();
  const tokens = tokenize(message);

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has("آدرس", "نشانی", "کجاست", "address", "location", "عنوان المركز", "العنوان")) {
    return locale === "en"
      ? `📍 Address: ${basics.address}\n📞 Phones: ${basics.phones}\n✉️ Email: ${basics.email}`
      : locale === "ar"
        ? `📍 العنوان: ${basics.address}\n📞 الهواتف: ${basics.phones}\n✉️ البريد: ${basics.email}`
        : `📍 نشانی مرکز: ${basics.address}\n📞 تلفن‌های تماس: ${basics.phones}\n✉️ ایمیل: ${basics.email}\n\nمشاهده روی نقشه: صفحه «تماس با ما» (/contact)`;
  }

  if (has("تلفن", "شماره", "تماس", "phone", "number", "contact", "هاتف", "اتصال")) {
    return locale === "en"
      ? `📞 Phones: ${basics.phones}\n✉️ Email: ${basics.email}`
      : locale === "ar"
        ? `📞 الهواتف: ${basics.phones}\n✉️ البريد: ${basics.email}`
        : `📞 تلفن‌های تماس: ${basics.phones}\n✉️ ایمیل: ${basics.email}\n\nفرم ارتباط مستقیم: /contact`;
  }

  if (has("خبر", "اخبار", "news", "تازه", "آخرین", "latest", "أخبار")) {
    const newsItems = items.filter((i) => i.extra?.startsWith("خبر")).slice(0, 5);
    if (newsItems.length) {
      return locale === "en"
        ? `📰 Latest news of the center:\n${newsItems.map((i, idx) => `${idx + 1}. ${i.title} — ${i.extra} (${i.link})`).join("\n")}`
        : locale === "ar"
          ? `📰 آخر أخبار المركز:\n${newsItems.map((i, idx) => `${idx + 1}. ${i.title} — ${i.extra} (${i.link})`).join("\n")}`
          : `📰 آخرین اخبار مرکز:\n${newsItems.map((i, idx) => `${idx + 1}. «${i.title}» — ${i.extra} (${i.link})`).join("\n")}`;
    }
  }

  if (has("اطلاعیه", "اعلان", "announcement")) {
    const ann = items.filter((i) => i.extra?.startsWith("اطلاعیه")).slice(0, 5);
    if (ann.length) {
      return `📢 ${ann.map((i, idx) => `${idx + 1}. «${i.title}» — ${i.extra} (${i.link})`).join("\n")}`;
    }
  }

  if (has("ثبت نام", "ثبت‌نام", "پذیرش", "register", "admission", "تسجيل")) {
    const reg = items.filter((i) =>
      (i.title + " " + i.text).includes("ثبت") || (i.title + " " + i.text).includes("پذیرش")
    );
    return locale === "en"
      ? `📝 Registration: ${reg[0] ? `${reg[0].title} (${reg[0].link})` : "see announcements"}\nYou can also use the membership system at /membership`
      : locale === "ar"
        ? `📝 التسجيل: ${reg[0] ? `${reg[0].title} (${reg[0].link})` : "راجع الإعلانات"}`
        : `📝 اطلاعات ثبت‌نام: ${reg[0] ? `«${reg[0].title}» (${reg[0].link})` : "در اطلاعیه‌های مرکز"}\n\nهمچنین می‌توانید در سامانهٔ عضویت دانشجویان (/membership) ثبت‌نام کنید یا با تلفن ${basics.phones.split(",")[0]?.trim()} تماس بگیرید.`;
  }

  // تطبیق عمومی کلیدواژه‌ای
  if (tokens.length) {
    const scored = items
      .map((item) => {
        const hay = `${item.title} ${item.text}`.toLowerCase();
        let score = 0;
        for (const t of tokens) {
          if (item.title.toLowerCase().includes(t)) score += 3;
          else if (hay.includes(t)) score += 1;
        }
        return { item, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length && scored[0].score >= 2) {
      const parts = scored.map(({ item }, idx) => {
        const snippet = item.text.replace(/\s+/g, " ").trim().slice(0, 220);
        return `${idx === 0 ? "" : "\n"}🔹 «${item.title}»${item.extra ? ` (${item.extra})` : ""}\n${snippet}${snippet.length >= 220 ? "…" : ""}\n🔗 ${item.link}`;
      });
      return parts.join("\n");
    }
  }

  // پاسخ پیش‌فرض
  return locale === "en"
    ? `I couldn't find an exact match. You can ask about news, programs, systems, forms or contact info.\n📞 ${basics.phones} | ✉️ ${basics.email}`
    : locale === "ar"
      ? `لم أجد تطابقاً دقيقاً. يمكنك السؤال عن الأخبار أو البرامج أو النماذج أو معلومات الاتصال.\n📞 ${basics.phones} | ✉️ ${basics.email}`
      : `پاسخ دقیقی برای این پرسش پیدا نکردم. می‌توانید دربارهٔ اخبار، اطلاعیه‌ها، رشته‌های تحصیلی، سامانه‌ها، فرم‌ها و اطلاعات تماس بپرسید.\n\n📞 تلفن: ${basics.phones}\n✉️ ایمیل: ${basics.email}`;
}
