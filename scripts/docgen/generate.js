/* تولید سند «راهنمای عملیات، پایش و عیب‌یابی سامانهٔ uastemdad.ir»
 * فارسی RTL — بر پایهٔ docx skill (R1 cover recipe, Profile A rules)
 * اجرا: node generate.js
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, TableLayoutType, SectionType,
  PageBreak, TableOfContents,
} = require("docx");
const fs = require("fs");

/* ---------------------------------------------------------------- palette */
// DS-1 Deep Sea (ops runbook) — از design-system.md
const P = {
  coverBg: "0B1C2C", coverTitle: "FFFFFF", coverSub: "B0B8C0",
  coverMeta: "90989F", coverFooter: "687078", accent: "529286",
  primary: "1C3D39",        // تیرهٔ سبزآبی برای تیترهای بدنه
  body: "1A1A1A",
  secondary: "6B7580",
  headerBg: "529286", headerText: "FFFFFF",
  innerLine: "BECFCC", surface: "EDF3F1",
  cmdBg: "F2F6F5",
};
const FA = { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" };
const MONO = { ascii: "Courier New", hAnsi: "Courier New", eastAsia: "Courier New", cs: "Courier New" };

const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function fa(n) { return String(n).replace(/\d/g, d => faDigits[+d]); }

/* ---------------------------------------------------------------- helpers */
function R(text, o = {}) {
  return new TextRun({
    text,
    rightToLeft: true,
    font: FA,
    size: o.size || 24,
    sizeComplexScript: o.size || 24,
    bold: !!o.bold,
    boldComplexScript: !!o.bold,
    italics: !!o.italics,
    color: o.color || P.body,
  });
}

function body(text, o = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: o.after == null ? 120 : o.after, before: o.before || 0 },
    children: [R(text, o)],
  });
}

function bodyRuns(runs, o = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: o.after == null ? 120 : o.after, before: o.before || 0 },
    children: runs,
  });
}

// آیتم فهرست وار — یک خط، هم‌تراز با ابتدای سطر (راست در RTL)
function bullet(text, o = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { line: 312, after: 60 },
    children: [R("•  " + text, o)],
  });
}

// بلوک دستور (LTR — هم‌تراز چپ، مونواسپیس)
function cmd(text, o = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, before: o.before || 40, after: o.after == null ? 100 : o.after },
    shading: { type: ShadingType.CLEAR, fill: P.cmdBg },
    indent: { left: 240, right: 240 },
    children: [new TextRun({
      text, font: MONO, size: 20, sizeComplexScript: 20, color: "0F3B36",
    })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 360, after: 160, line: 380, lineRule: "atLeast" },
    children: [R(text, { size: 32, bold: true, color: P.primary })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240, after: 120, line: 340, lineRule: "atLeast" },
    children: [R(text, { size: 28, bold: true, color: P.primary })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 200, after: 100, line: 320, lineRule: "atLeast" },
    children: [R(text, { size: 24, bold: true, color: P.primary })],
  });
}

// عنوان جدول (کنار هم ماندن با جدول)
function tableCaption(text) {
  return new Paragraph({
    bidirectional: true,
    keepNext: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 160, after: 80, line: 312 },
    children: [R(text, { size: 21, bold: true, color: P.primary })],
  });
}

// جدول RTL استاندارد — headers: آرایه متن، rows: آرایهٔ آرایه، widths: درصد
function rtlTable(headers, rows, widths) {
  const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
  const headRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((t, i) => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: P.headerBg },
      margins: cellMargins,
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        bidirectional: true, alignment: AlignmentType.CENTER, spacing: { line: 312 },
        children: [R(t, { size: 21, bold: true, color: P.headerText })],
      })],
    })),
  });
  const dataRows = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((t, i) => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: ri % 2 === 1 ? P.surface : "FFFFFF" },
      margins: cellMargins,
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { line: 312 },
        children: [R(t, { size: 21 })],
      })],
    })),
  }));
  return new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.innerLine },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: P.innerLine },
    },
    rows: [headRow, ...dataRows],
  });
}

/* ---------------------------------------------------------------- cover (R1 — RTL mirror) */
const NB = { style: BorderStyle.NONE, size: 0, color: "auto" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };

function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0 } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

function buildCoverR1RTL(config) {
  const padR = 1200, padL = 800;
  const titlePt = 36;
  const titleLines = config.titleLines;
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentRight = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];

  // ۱) فضای بالایی
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  // ۲) برچسب لاتین با خط زیرین accent (آینهٔ R1 — راست‌چین)
  children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    indent: { right: padR, left: padL },
    spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
    children: [new TextRun({
      text: config.englishLabel.split("").join(" "),
      size: 18, sizeComplexScript: 18, color: P.accent,
      font: { ascii: "Arial", hAnsi: "Arial", cs: "Arial" }, characterSpacing: 40,
    })],
  }));

  // ۳) عنوان اصلی
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      indent: { right: padR, left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [R(titleLines[i], { size: titleSize, bold: true, color: P.coverTitle })],
    }));
  }

  // ۴) زیرعنوان
  children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    indent: { right: padR, left: padL },
    spacing: { after: 800, line: 340, lineRule: "atLeast" },
    children: [R(config.subtitle, { size: 24, color: P.coverSub })],
  }));

  // ۵) خطوط اطلاعات با نوار accent سمت راست
  for (const line of config.metaLines) {
    children.push(new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      indent: { right: padR + 200, left: padL },
      spacing: { after: 80, line: 312 },
      border: { right: accentRight },
      children: [R(line, { size: 24, color: P.coverMeta })],
    }));
  }

  // ۶) فضای پایینی
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  // ۷) پانوشت جلد با خط بالایی
  children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    indent: { right: padR, left: padL },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [R(config.footerText, { size: 16, color: P.coverFooter })],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.coverBg },
        borders: noBorders,
        children,
      })],
    })],
  })];
}

/* ---------------------------------------------------------------- footers/headers */
function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240 },
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FA })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { line: 240 },
      children: [R("راهنمای عملیات و پایش سامانه — uastemdad.ir", { size: 18, color: "808080" })],
    })],
  });
}

/* ================================================================ محتوا */
const content = [];

/* ---------- ۱. خلاصهٔ مدیریتی ---------- */
content.push(h1("۱. خلاصهٔ مدیریتی"));
content.push(body(
  "سامانهٔ اینترنتی مرکز آموزش علمی–کاربردی (uastemdad.ir) روی یک سرور ویندوز با نشانی 94.182.131.94 میزبانی می‌شود؛ برنامهٔ اصلی با Next.js روی پورت 3003 اجرا می‌شود، وب‌سرور Caddy وظیفهٔ HTTPS و دامنه را بر عهده دارد و بات اطلاع‌رسانی بله هم داخل همان پروژه کار می‌کند. تا پیش از این، اگر پروسهٔ برنامه به هر دلیلی متوقف می‌شد (کرش، کمبود حافظه، ری‌استارت شدن سرور یا بسته‌شدن پنجرهٔ اجرا)، سامانه تا زمانی که مدیر متوجه می‌شد و به سرور سر می‌زد، از دسترس خارج بود و هیچ اطلاع‌رسانی خودکاری وجود نداشت."
));
content.push(body(
  "برای رفع این مشکل، سه لایهٔ دفاعی به سامانه اضافه شده است. لایهٔ نخست، نقطهٔ بررسی سلامت (/api/health) است که وضعیت دیتابیس، حافظه و بات را در قالب پاسخ استاندارد گزارش می‌کند. لایهٔ دوم، «مانیتور داخلی» است که داخل خود برنامه هر ۶۰ ثانیه یک‌بار سلامت دیتابیس را می‌سنجد، «ضربان» می‌نویسد و بعد از هر بار بالا آمدن برنامه، پیامی شامل مدت دقیق قطعی برای همهٔ مدیرانِ بات بله می‌فرستد. لایهٔ سوم، «پایشگر بیرونی» است: یک وظیفهٔ زمان‌بندی ویندوز (uastemdad-monitor) که هر ۱ دقیقه سلامت برنامه و HTTPS را چک می‌کند، در صورت قطعی تا ۳ بار راه‌اندازی مجدد خودکار انجام می‌دهد و اگر سامانه بالا نیامد، پیام هشدار فوری به بات بله می‌فرستد."
));
content.push(body(
  "نتیجهٔ این طراحی این است که دان‌شدن سامانه دیگر «بی‌سروصدا» نیست: در اغلب موارد قطعی در کمتر از ۳ دقیقه به‌صورت خودکار ترمیم می‌شود و مدیر بلافاصله در بله از زمان و مدت آن باخبر می‌شود؛ فقط در مواردی که راه‌اندازی خودکار نتیجه ندهد، اقدام دستی لازم می‌شود که چک‌لیست گام‌به‌گام آن در بخش ۳ و راهنمای کامل در بخش‌های ۵ و ۶ همین سند آمده است. نسخهٔ متنی این مستندات همراه کد، در پوشهٔ docs مخزن برنامه هم قرار دارد تا همیشه همراه سرور به‌روز بماند."
));

/* ---------- ۲. سامانهٔ پایش ---------- */
content.push(h1("۲. سامانهٔ پایش: اجزا، پیام‌ها و نصب"));
content.push(h2("۲-۱. اجزای سامانهٔ پایش"));
content.push(body(
  "پایش وضعیت سامانه بر پایهٔ چهار جزء ساخته شده که دو تا از آن‌ها داخل برنامه و دو تا در سطح سیستم‌عامل ویندوز فعالیت می‌کنند. جدول زیر نقش هر جزء و محل آن را نشان می‌دهد."
));
content.push(tableCaption("جدول ۱ — اجزای سامانهٔ پایش و وظیفهٔ هر یک"));
content.push(rtlTable(
  ["جزء", "محل", "وظیفه"],
  [
    ["نقطهٔ بررسی سلامت /api/health", "درون برنامه (Next.js)", "پاسخ JSON با وضعیت دیتابیس، حافظه، بات و مدت کار پروسه؛ اگر دیتابیس پاسخ ندهد کد 503 برمی‌گرداند"],
    ["مانیتور داخلی (monitor.ts)", "درون برنامه، هر ۶۰ ثانیه", "ثبت ضربان در دیتابیس، گزارش بالا آمدن و مدت قطعی به مدیران بات، هشدار حافظهٔ بالا و فضای کم دیسک"],
    ["پایشگر بیرونی (monitor-app.ps1)", "C:\\uastemdad\\app\\scripts", "چک هر دقیقه، راه‌اندازی مجدد خودکار تا ۳ بار، پیام «دان است»، ری‌استارت Caddy در مشکل HTTPS، هشدار دیسک"],
    ["وظیفهٔ زمان‌بندی uastemdad-monitor", "Task Scheduler ویندوز (کاربر SYSTEM)", "اجرای پایشگر بیرونی هر ۱ دقیقه — حتی پیش از ورود کاربر به سرور"],
  ],
  [28, 26, 46]
));
content.push(body(
  "هماهنگی میان پایشگر و عملیات نگهداری با «قفلِ نگهداری» انجام می‌شود: هر وقت اسکریپت به‌روزرسانی (update-app.ps1) در جریان است یا مدیر با دستور start-app.ps1 -Stop سامانه را عمداً متوقف کرده، فایلی به نام maintenance.lock در پوشهٔ لاگ‌ها ساخته می‌شود. پایشگر تا ۲۰ دقیقه به این قفل احترام می‌گذارد و وسط به‌روزرسانی یا توقف عمدی، برنامه را دوباره بالا نمی‌آورد. به‌محض راه‌اندازی بعدی توسط start-app.ps1 یا پایان به‌روزرسانی، قفل برداشته می‌شود و پایش دوباره فعال می‌گردد.",
  { before: 80 }
));

content.push(h2("۲-۲. پیام‌های بات بله و اقدام لازم برای هر یک"));
content.push(body(
  "پیام‌های پایش به گفتگوی مدیرانِ بات بله (همان باتی که برای انتشار خبر استفاده می‌شود) ارسال می‌شوند. پیام‌های «بالا آمدن» بدون هیچ تنظیم اضافه‌ای به همهٔ مدیرانِ متصل می‌رسد؛ پیام‌های هشدارِ پایشگر بیرونی (دان ماندن، مشکل HTTPS و دیسک) فقط زمانی ارسال می‌شوند که شناسهٔ گفتگوی مدیر (MONITOR_CHAT_ID) در فایل .env تنظیم شده باشد. جدول زیر معنای هر پیام و اقدام پیشنهادی را نشان می‌دهد."
));
content.push(tableCaption("جدول ۲ — معنای پیام‌های پایش و اقدام موردنیاز"));
content.push(rtlTable(
  ["پیام", "معنا", "اقدام مدیر"],
  [
    ["سبز — «سامانه بالا آمد (ری‌استارت سریع)»", "برنامه بالا آمده و خارج از سرویس‌بودن کمتر از ۲ دقیقه بوده", "هیچ؛ پیام تأیید سلامت است"],
    ["سبز — «سامانه دوباره بالا آمد + مدت خارج از سرویس»", "قطعی واقعی رخ داده و سامانه بالا آمده است", "اگر مکرر شد، بخش ۴ (علت‌ها) را ببینید"],
    ["قرمز — «دیتابیس پاسخ نمی‌دهد»", "دیتابیس SQLite در دسترس نیست", "ری‌استارت با start-app.ps1 -Restart؛ اگر تکرار شد، گام‌های ۷ و ۸ چک‌لیست"],
    ["قرمز — «سامانه دان است؛ راه‌اندازی خودکار ناموفق بود»", "پایشگر ۳ بار تلاش کرده و برنامه بالا نیامده", "اقدام دستی: چک‌لیست بخش ۳ را از گام ۲ ادامه دهید؛ متن پیام شامل ۱۵ خط آخر لاگ است"],
    ["نارنجی — «مشکل HTTPS به‌صورت خودکار رفع شد»", "Caddy ری‌استارت شد و دامنه در دسترس قرار گرفت", "هیچ؛ فقط آگاهی"],
    ["نارنجی — «برنامه سالم است اما HTTPS در دسترس نیست»", "مشکل از Caddy، گواهی یا فایروال پورت‌های 80/443 است", "اجرای fix-https.ps1؛ اگر نشد گام ۶ چک‌لیست"],
    ["زرد — «حافظهٔ پروسهٔ سامانه بالاست»", "مصرف حافظه از حدود ۱٫۴ گیگابایت گذشته", "ری‌استارت برنامه در ساعات کم‌ترافیک"],
    ["زرد — «فضای دیسک سرور کم است»", "کمتر از ۲ گیگابایت روی درایو C مانده", "پاک‌سازی لاگ‌ها و بکاپ‌های قدیمی؛ دیسکِ پر دیتابیس را خراب می‌کند"],
  ],
  [34, 32, 34]
));

content.push(h2("۲-۳. نصب، تنظیم و آزمایش پایش"));
content.push(body(
  "پس از دریافت آخرین کد با update-app.ps1، برای فعال‌سازی کامل پایش این سه گام را روی سرور و با دسترسی Administrator انجام دهید. نصب فقط یک‌بار لازم است و پس از آن وظیفهٔ پایش با هر ری‌استارت ویندوز خودکار فعال می‌ماند."
));
content.push(cmd("powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\update-app.ps1", { after: 40 }));
content.push(cmd("powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\install-monitor.ps1", { after: 40 }));
content.push(cmd("powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\scripts\\monitor-app.ps1 -Test"));
content.push(body(
  "گام سوم وضعیت برنامه، HTTPS، وظایف زمان‌بندی و دیسک را نمایش می‌دهد و اگر شناسهٔ گفتگو تنظیم شده باشد یک پیام آزمایشی به بات می‌فرستد. برای تنظیم شناسه، ابتدا در بات بله دستور /status را بزنید؛ از نسخهٔ جدید به بعد خط «شناسهٔ گفتگوی شما» نمایش داده می‌شود. سپس آن عدد را با اسکریپت زیر در فایل .env ثبت کنید تا پیام‌های هشدارِ پایشگر بیرونی نیز به شما برسد:"
));
content.push(cmd("powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\set-monitor-chat.ps1 -ChatId <شناسهٔ گفتگوی شما>"));
content.push(body(
  "لاگ فعالیت پایشگر در مسیر C:\\uastemdad\\logs\\monitor.log نوشته می‌شود و آخرین وضعیت (در حال دان بودن یا سالم، تعداد تلاش‌های راه‌اندازی مجدد و زمان آخرین اقدام) در فایل monitor-state.json نگهداری می‌شود. برای دیدن وضعیت زنده در هر لحظه، دستور monitor-app.ps1 -Test را اجرا کنید؛ این دستور هیچ تغییری در سامانه نمی‌دهد و فقط گزارش می‌دهد."
));

/* ---------- ۳. چک‌لیست عیب‌یابی ---------- */
content.push(h1("۳. چک‌لیست عیب‌یابی سریع «سایت بالا نمی‌آید»"));
content.push(body(
  "این چک‌لیست برای مدیر طراحی شده که بدون دانش فنی عمیق، در چند دقیقه علت قطعی را پیدا کند یا دست‌کم اطلاعات کافی برای پیگیری جمع کند. گام‌ها را به ترتیب انجام دهید و در هر گام فقط دستور مربوط به همان گام را اجرا کنید. همهٔ دستورها در PowerShell با دسترسی Administrator اجرا می‌شوند؛ هر جا دستور دیگری لازم باشد در همان گام ذکر شده است."
));
content.push(tableCaption("جدول ۳ — چک‌لیست ده‌گامی عیب‌یابی"));
content.push(rtlTable(
  ["گام", "چه می‌سنجم", "دستور / اقدام", "تفسیر نتیجه"],
  [
    [fa(0), "آیا واقعاً دان است؟", "با مرورگر گوشی (اینترنت موبایل) https://uastemdad.ir/api/health را باز کنید", "اگر پاسخ JSON دیدید سایت از بیرون سالم است؛ مشکل احتمالاً از شبکهٔ داخلی شماست"],
    [fa(1), "وضعیت کلی سامانه", "powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\start-app.ps1 -Status", "نمای کلی وظایف، پورت‌ها، برنامه و HTTPS و ۵ خط آخر لاگ را یک‌جا نشان می‌دهد"],
    [fa(2), "لاگ برنامه", "Get-Content C:\\uastemdad\\logs\\app.log -Tail 50", "خطاهای قرمز مانند Error، EADDRINUSE یا «database is locked» علت قطعی را معمولاً همان‌جا نشان می‌دهند"],
    [fa(3), "اشغال پورت 3003", "netstat -ano | findstr :3003", "خط LISTENING یعنی پروسه‌ای روی پورت نشسته؛ نبودِ خط یعنی برنامه اصلاً اجرا نیست"],
    [fa(4), "وظایف زمان‌بندی", "schtasks /Query /TN uastemdad-app /FO LIST و همین برای uastemdad-proxy", "وضعیت باید Running باشد؛ «Ready» یا «Could not start» یعنی وظیفه اجرا نشده"],
    [fa(5), "ری‌استارت استاندارد", "powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\start-app.ps1 -Restart", "بیشتر موارد در همین گام حل می‌شود؛ ۲ تا ۳ دقیقه صبر کنید و پیام سبز بات را چک کنید"],
    [fa(6), "سلامت HTTPS", "Get-Content C:\\uastemdad\\logs\\caddy.log -Tail 30 و سپس C:\\uastemdad\\restart-caddy.cmd", "اگر برنامه روی پورت 3003 سالم است ولی سایت باز نمی‌شود، مشکل از Caddy، گواهی یا فایروال است؛ در صورت تکرار fix-https.ps1 را اجرا کنید"],
    [fa(7), "دیتابیس و فضا", "وجود فایل C:\\uastemdad\\db\\custom.db و اجرای Get-PSDrive C", "نبودن یا صفر بودن فایل دیتابیس و فضای کمتر از ۲ گیگابایت دو علت شایع خرابی هستند"],
    [fa(8), "بیلد نسخهٔ تولید", "cd C:\\uastemdad\\app و سپس npm run build", "اگر بیلد خطا داد، خروجی را ذخیره کنید؛ تا رفع مشکل با restart-app.cmd نسخهٔ قبلی بالا می‌آید"],
    [fa(9), "زمان بوت ویندوز", "systeminfo | findstr \"System Boot Time\"", "اگر زمان بوت هم‌زمان با شروع قطعی است، سرور ری‌استارت شده؛ وظیفه‌های ONSTART باید برنامه را خودکار بالا آورده باشند — گام ۴ را دوباره چک کنید"],
  ],
  [8, 18, 38, 36]
));
content.push(body(
  "اگر پس از اجرای همهٔ گام‌ها مشکل حل نشد، خروجی گام ۱، گام ۲ و گام ۶ را کپی کنید و در گفتگوی پشتیبانی ارسال نمایید؛ این سه خروجی تقریباً همیشه برای تشخیص کافی است. یادآوری: تا وقتی عیب‌یابی می‌کنید، نیازی به توقف پایشگر نیست؛ اگر قصد توقف طولانی دارید از start-app.ps1 -Stop استفاده کنید تا پایشگر هم‌زمان با شما، برنامه را بالا نیاورد.",
  { before: 80 }
));

/* ---------- ۴. جدول علامت → علت → اقدام ---------- */
content.push(h1("۴. جدول تشخیص: علامت، علت محتمل و اقدام"));
content.push(body(
  "جدول زیر تجربهٔ رایج‌ترین حالت‌های خرابی این سامانه را خلاصه می‌کند. «علامت» همان چیزی است که می‌بینید، «علت محتمل» پرتکرارترین عامل در این معماری است و «اقدام» نخستین کاری است که باید انجام دهید. اگر اقدام اول جواب نداد، سراغ چک‌لیست بخش ۳ بروید."
));
content.push(tableCaption("جدول ۴ — علائم، علت‌های محتمل و اقدام‌های متناظر"));
content.push(rtlTable(
  ["علامت", "علت محتمل", "اقدام"],
  [
    ["سایت برای همه دان است و /api/health پاسخ نمی‌دهد", "کرش پروسهٔ برنامه یا توقف وظیفهٔ uastemdad-app", "ری‌استارت با start-app.ps1 -Restart؛ سپس گام ۲ چک‌لیست برای دیدن علت"],
    ["سایت دان است ولی http://IP:3003 سالم است", "مشکل HTTPS: توقف Caddy، انقضای گواهی یا بستن پورت 80/443 در فایروال", "restart-caddy.cmd؛ در صورت تکرار fix-https.ps1 و بررسی باز بودن پورت‌ها"],
    ["صفحهٔ خطای 500 یا صفحهٔ سفید", "خطای کد یا ناسازگاری دیتابیس پس از به‌روزرسانی", "گام ۲ چک‌لیست (لاگ)؛ در صورت نیاز prisma db push و npm run build"],
    ["سایت سالم است ولی بات بله پاسخ نمی‌دهد", "توکن بات تنظیم نیست یا دو نمونهٔ polling درگیری 409 دارند", "set-bot-token.ps1 برای تنظیم توکن؛ بررسی لاگ [bale-bot] در app.log"],
    ["پس از به‌روزرسانی، برنامه بالا نمی‌آید", "بیلد ناقص یا قفل‌ماندن فایل‌ها در حین اجرای قبلی", "اجرای دوباره update-app.ps1؛ در صورت شکست restart-app.cmd برای نسخهٔ قبلی"],
    ["پس از ری‌استارت ویندوز، سامانه بالا نیامده", "وظایف زمان‌بندی ساخته نشده یا غیرفعال شده‌اند", "بررسی گام ۴؛ نصب مجدد با deploy.ps1 و install-monitor.ps1"],
    ["خطای EADDRINUSE:3003 در لاگ", "دو پروسهٔ node هم‌زمان روی پورت", "taskkill /F /IM node.exe و سپس start-app.ps1"],
    ["پیام زرد «فضای دیسک کم است»", "انباشت لاگ‌ها، بکاپ‌ها یا عکس‌ها", "پاک‌سازی C:\\uastemdad\\logs و بکاپ‌های قدیمی؛ انتقال بکاپ به فضای دیگر"],
    ["خطای «database is locked» در لاگ", "دسترسی هم‌زمان چند پروسه به SQLite یا قفل آنتی‌ویروس", "ری‌استارت برنامه؛ مطمئن شوید فقط یک وظیفهٔ uastemdad-app وجود دارد"],
    ["بات چند پیام پشت‌سرهم «بالا آمد» می‌فرستد", "کرش‌های تکراری پروسه (مثلاً کمبود حافظه)", "گام ۲ چک‌لیست؛ بررسی مصرف حافظه و ری‌استارت کامل سرور در ساعات کم‌ترافیک"],
  ],
  [34, 30, 36]
));

/* ---------- ۵. راهنمای راه‌اندازی دوباره ---------- */
content.push(h1("۵. راهنمای کامل راه‌اندازی دوبارهٔ سامانه"));
content.push(h2("۵-۱. دستورهای پایهٔ روزمره"));
content.push(body(
  "تمام عملیات روزمره با پنج اسکریپت انجام می‌شود که در ریشه یا پوشهٔ C:\\uastemdad\\app قرار دارند و همه باید با دسترسی Administrator اجرا شوند. جدول زیر نقش هر اسکریپت را نشان می‌دهد؛ پس از هر تغییر مهم، اسکریپت وضعیت را در پایان اجرا نمایش می‌دهد و در صورت سلامت، پیام سبز بات نیز دریافت می‌کنید."
));
content.push(tableCaption("جدول ۵ — اسکریپت‌های عملیاتی و کاربرد هر یک"));
content.push(rtlTable(
  ["اسکریپت", "کاربرد", "زمان استفاده"],
  [
    ["start-app.ps1", "بالا آوردن برنامه و HTTPS + نمایش وضعیت", "پس از توقف، پس از بوت سرور، یا هنگام شروع کار"],
    ["start-app.ps1 -Restart", "توقف کامل و راه‌اندازی دوباره", "نخستین اقدام در هر قطعی"],
    ["start-app.ps1 -Stop", "توقف عمدی (پایشگر هم متوقف می‌ماند)", "نگهداری، تعویض قطعات، انتقال بکاپ"],
    ["start-app.ps1 -Status", "فقط نمایش وضعیت بدون تغییر", "بررسی سریع در هر لحظه"],
    ["update-app.ps1", "دریافت کد جدید، نصب وابستگی‌ها، همگام‌سازی دیتابیس، بیلد و راه‌اندازی", "وقتی نسخهٔ جدیدی از کد اعلام می‌شود"],
    ["fix-https.ps1", "اصلاح فایروال، دریافت Caddy و فعال‌سازی HTTPS", "وقتی HTTPS مدت‌ها در دسترس نیست"],
    ["install-monitor.ps1", "نصب وظیفهٔ پایش هر ۱ دقیقه", "یک‌بار پس از استقرار و پس از هر استقرار مجدد"],
    ["monitor-app.ps1 -Test", "نمایش وضعیت پایش + پیام آزمایشی بات", "آزمایش دوره‌ای سامانهٔ پایش"],
  ],
  [26, 42, 32]
));

content.push(h2("۵-۲. ری‌استارت استاندارد"));
content.push(body("برای ری‌استارت معمولی این توالی را اجرا کنید؛ کل فرایند بین ۲ تا ۳ دقیقه طول می‌کشد:"));
content.push(cmd("powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\start-app.ps1 -Restart", { after: 100 }));
content.push(body(
  "پس از اجرا، اسکریپت به‌ترتیب وظایف برنامه و HTTPS را متوقف و دوباره اجرا می‌کند و تا ۲ دقیقه سلامت پورت 3003 را بررسی می‌کند. در پایان جدول وضعیت نمایش داده می‌شود؛ پنج سطر آخرِ آن، آخرین رخدادهای لاگ است. چند لحظه بعد، پیام سبز «سامانه بالا آمد» را در بات بله دریافت می‌کنید که تأیید نهایی سلامت از دید خود برنامه است. اگر پیام نرسید یا وضعیت «بدون پاسخ» بود، به بخش ۵-۳ بروید."
));

content.push(h2("۵-۳. اگر ری‌استارت جواب نداد"));
content.push(body("این توالی پنج‌مرحله‌ای تقریباً هر برنامهٔ قفل‌شده‌ای را احیا می‌کند؛ هر مرحله را کامل انجام دهید و بعد مرحلهٔ بعد:"));
content.push(bullet("مرحلهٔ ۱ — لاگ را بخوانید تا علت را بدانید:  Get-Content C:\\uastemdad\\logs\\app.log -Tail 50"));
content.push(bullet("مرحلهٔ ۲ — همهٔ پروسه‌های node را ببندید:  taskkill /F /IM node.exe"));
content.push(bullet("مرحلهٔ ۳ — برنامه را دوباره اجرا کنید:  C:\\uastemdad\\restart-app.cmd"));
content.push(bullet("مرحلهٔ ۴ — دو دقیقه صبر و بررسی:  powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\start-app.ps1 -Status"));
content.push(bullet("مرحلهٔ ۵ — اگر باز هم نشد، استقرار کامل را اجرا کنید:  powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\deploy.ps1 (داده‌های دیتابیس و آپلودها حفظ می‌شوند)"));
content.push(body(
  "اگر مرحلهٔ ۵ هم موفق نشد، خروجی کامل صفحه را کپی و ذخیره کنید؛ آن خروجی همراه گام‌های ۱ و ۲ چک‌لیست، مبنای پیگیری با پشتیبانی خواهد بود. از اجرای مجدد مکرر deploy.ps1 بدون خواندن خطاها بپرهیزید، چون هر اجرا چند دقیقه زمان می‌برد و اگر علت واقعی چیز دیگری باشد (مثل پر بودن دیسک) حل نمی‌شود.",
  { before: 80 }
));

content.push(h2("۵-۴. وضعیت پس از ری‌استارت ویندوز"));
content.push(body(
  "وظایف uastemdad-app و uastemdad-proxy با نوع راه‌اندازی «در زمان بوت سیستم» (ONSTART) و با کاربر SYSTEM تعریف شده‌اند؛ یعنی بعد از هر ری‌استارت ویندوز، حتی بدون ورود کاربر، برنامه و HTTPS باید خودکار بالا بیایند و یک دقیقه بعد پایشگر هم فعال می‌شود. اگر پس از ری‌استارت سرور سایت باز نشد، فقط این سه چیز را چک کنید: اجرای start-app.ps1 -Status، اجرای گام ۴ چک‌لیست (وضعیت وظایف) و اجرای دستی start-app.ps1 اگر وظایف متوقف مانده‌اند. اگر وظایف اصلاً وجود ندارند (مثلاً پس از تعویض سرور)، یک‌بار deploy.ps1 و سپس install-monitor.ps1 را اجرا کنید."
));

content.push(h2("۵-۵. به‌روزرسانی امن کد"));
content.push(body(
  "به‌روزرسانی همیشه با update-app.ps1 انجام می‌شود و نباید آن را در پنجرهٔ دیگری یا با توقف نیمه‌کاره اجرا کنید. این اسکریپت خودش قفلِ نگهداری می‌نویسد تا پایشگر در حین بیلد مزاحم نشود، کد را از گیت‌هاب می‌گیرد، دیتابیس را بدون از دست رفتن داده‌ها همگام می‌کند، بیلد می‌زند و در پایان سلامت پورت و دامنه را چک می‌کند. اگر بیلد شکست خورد، نسخهٔ قبلی کد هنوز روی سرور است و با restart-app.cmd می‌توانید فوراً به سرویس برگردید و سپس در وقت مناسب دوباره تلاش کنید. پیش از هر به‌روزرسانی، بکاپ دیتابیس را بگیرید (بخش ۵-۶)؛ این کار کمتر از یک دقیقه طول می‌کشد."
));

content.push(h2("۵-۶. بکاپ دوره‌ای دیتابیس و فایل‌ها"));
content.push(body(
  "تمام داده‌های پویا فقط در دو مسیر است: فایل دیتابیس C:\\uastemdad\\db\\custom.db و پوشهٔ آپلودها C:\\uastemdad\\data\\uploads. بکاپ گرفتن یعنی کپی همین دو مورد. دستور زیر در هر اجرا، یک پوشهٔ تاریخ‌دار در D:\\backup می‌سازد (اگر درایو دوم دارید؛ در غیر این صورت مسیر را عوض کنید):"
));
content.push(cmd("robocopy C:\\uastemdad\\db D:\\backup\\db-%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2% custom.db /R:2 /W:5"));
content.push(cmd("robocopy C:\\uastemdad\\data\\uploads D:\\backup\\uploads /E /R:2 /W:5 /MAXAGE:30"));
content.push(body(
  "بکاپ دیتابیس را دست‌کم هفته‌ای یک‌بار و همیشه پیش از update-app.ps1 بگیرید و چند نسخهٔ اخیر را نگه دارید. فایل‌های بکاپ را اگر می‌توانید روی فضای دیگری خارج از سرور (NAS یا درایو شبکهٔ سازمان) هم کپی کنید. لاگ‌های قدیمی را قبل از بکاپ، از پوشهٔ logs حذف نکنید؛ لاگ‌ها در تشخیص علت خرابی ضروری‌اند و حجم کمی دارند."
));

/* ---------- ۶. خطاهای رایج ---------- */
content.push(h1("۶. خطاهای رایج و راه‌حل آن‌ها"));
content.push(body(
  "در جدول زیر متداول‌ترین پیام‌های خطای این سامانه، معنای هر یک و راه‌حل کوتاه آمده است. اکثر این خطاها در لاگ برنامه (app.log) یا لاگ بیلد دیده می‌شوند؛ عبارت پررنگ هر خطا را در لاگ جست‌وجو کنید تا به ریشهٔ مشکل برسید."
));
content.push(tableCaption("جدول ۶ — خطاهای رایج، معنا و راه‌حل"));
content.push(rtlTable(
  ["خطا", "معنا", "راه‌حل"],
  [
    ["EADDRINUSE :::3003", "پورت 3003 قبلاً اشغال شده (دو پروسهٔ node)", "taskkill /F /IM node.exe سپس start-app.ps1؛ مطمئن شوید فقط یک وظیفهٔ app دارید"],
    ["EPERM / EBUSY هنگام npm install یا بیلد", "فایل‌ها به‌دلیل اجرای برنامهٔ قبلی قفل‌اند", "بستن node.exe و اجرای دوبارهٔ update-app.ps1؛ این کار خود اسکریپت هم انجام می‌دهد"],
    ["database is locked", "دسترسی هم‌زمان به فایل SQLite یا قفل آنتی‌ویروس", "ری‌استارت برنامه؛ مسیر دیتابیس را در مستثنیات آنتی‌ویروس قرار دهید"],
    ["getUpdates failed: 409", "دو نمونهٔ بات درگیر polling یا وب‌هوک قدیمی", "فقط یک وظیفهٔ uastemdad-app؛ بات وب‌هوک را خودش پاک می‌کند — بعد از یک دقیقه دوباره چک کنید"],
    ["BALE_BOT_TOKEN=MISSING", "توکن بات در .env تنظیم نیست", "powershell -ExecutionPolicy Bypass -File C:\\uastemdad\\app\\set-bot-token.ps1"],
    ["Prisma engine dll error", "فایل موتور دیتابیس قفل یا ناقص است", "بستن node.exe و اجرای npx prisma generate در پوشهٔ برنامه"],
    ["certificate / timeout در caddy.log", "پورت 80 مسدود است یا ساعت سرور ناهماهنگ", "باز بودن 80 و 443 در فایروال؛ همگام‌سازی ساعت ویندوز؛ سپس fix-https.ps1"],
    ["npm install کند یا شکست اتصال", "قطعی اینترنت یا مشکل DNS سرور", "update-app.ps1 خودش ۳ بار تلاش و در صورت نیاز از آینهٔ جایگزین نصب می‌کند؛ اگر باز نشد اتصال سرور را چک کنید"],
    ["502 / پاسخ خالی از دامنه ولی 3003 سالم", "برنامه دان است و Caddy فقط پراکسی بی‌پاسخ دارد", "ری‌استارت برنامه با start-app.ps1 -Restart"],
  ],
  [26, 30, 44]
));

/* ---------- ۷. نگهداری دوره‌ای ---------- */
content.push(h1("۷. برنامهٔ نگهداری دوره‌ای"));
content.push(body(
  "بیشتر خرابی‌ها با چند دقیقه توجه منظم قابل پیشگیری هستند. سه چرخهٔ نگهداری پیشنهاد می‌شود: چک روزانهٔ پیام‌های بات (کمتر از یک دقیقه)، چک هفتگی وضعیت و بکاپ، و چک ماهانهٔ به‌روزرسانی و سلامت سرور. جدول زیر خلاصهٔ اقدام‌های هر چرخه است."
));
content.push(tableCaption("جدول ۷ — چرخهٔ نگهداری روزانه، هفتگی و ماهانه"));
content.push(rtlTable(
  ["دوره", "اقدام", "دستور / توضیح"],
  [
    ["روزانه", "مرور پیام‌های پایش در بات", "پیام سبز = سالم؛ پیام زرد یا قرمز = اقدام طبق جدول ۲"],
    ["هفتگی", "بررسی وضعیت کلی و فضای دیسک", "start-app.ps1 -Status و Get-PSDrive C — فضای خالی باید بیش از ۵ گیگابایت باشد"],
    ["هفتگی", "بکاپ دیتابیس و آپلودها", "دستورهای بخش ۵-۶؛ همیشه پیش از به‌روزرسانی"],
    ["هفتگی", "بررسی اندازهٔ لاگ‌ها", "اگر مجموع پوشهٔ logs از حدود ۵۰ مگابایت گذشت، لاگ‌های قدیمی‌تر از یک ماه را پاک کنید"],
    ["ماهانه", "به‌روزرسانی کد", "update-app.ps1 در ساعات کم‌ترافیک، بعد از بکاپ"],
    ["ماهانه", "ری‌استارت کامل سرور در ساعات آرام", "برای پاک‌سازی حافظه و نصب به‌روزرسانی‌های ویندوز؛ پس از بوت، وضعیت را با پیام سبز بات تأیید کنید"],
    ["ماهانه", "آزمایش سامانهٔ پایش", "monitor-app.ps1 -Test — باید وضعیت سالم و پیام آزمایشی بدهد"],
  ],
  [14, 34, 52]
));
content.push(body(
  "این چرخه‌ها روی هم کمتر از ۳۰ دقیقه در ماه زمان می‌برند، اما از بزرگ‌ترین ریسک‌ها — پر شدن دیسک، گم شدن بکاپ و خاموش ماندن سامانه پس از بوت — جلوگیری می‌کنند. اگر هر یک از این کارها فراموش شود، پایشگر تا حد زیادی جای خالی را پر می‌کند؛ اما بکاپ و فضای دیسک را هیچ سامانه‌ای خودکار جایگزین نمی‌کند و مسئولیت آن با مدیر است.",
  { before: 80 }
));

/* ---------- ۸. پیوست ---------- */
content.push(h1("۸. پیوست: مسیرها، فایل‌ها و واژه‌های کلیدی"));
content.push(h2("۸-۱. مسیرهای مهم سرور"));
content.push(tableCaption("جدول ۸ — مسیرهای مهم و کاربرد هر مسیر"));
content.push(rtlTable(
  ["مسیر", "توضیح"],
  [
    ["C:\\uastemdad\\app", "کد برنامه (Next.js) — با update-app.ps1 از گیت‌هاب به‌روز می‌شود"],
    ["C:\\uastemdad\\app\\.env", "تنظیمات: توکن بات، مسیر دیتابیس، MONITOR_CHAT_ID و SITE_URL"],
    ["C:\\uastemdad\\db\\custom.db", "دیتابیس SQLite — مهم‌ترین فایل سامانه؛ بکاپ هفتگی"],
    ["C:\\uastemdad\\data\\uploads", "عکس‌ها و فایل‌های آپلودشده از پنل و بات"],
    ["C:\\uastemdad\\logs\\app.log", "لاگ برنامه — نخستین جا برای عیب‌یابی"],
    ["C:\\uastemdad\\logs\\caddy.log", "لاگ HTTPS و گواهی دامنه"],
    ["C:\\uastemdad\\logs\\monitor.log", "لاگ پایشگر: هر چک، ری‌استارت و پیام ارسالی"],
    ["C:\\uastemdad\\logs\\monitor-state.json", "وضعیت لحظه‌ای پایشگر (در حال دان بودن، تعداد تلاش‌ها)"],
    ["C:\\uastemdad\\logs\\maintenance.lock", "قفلِ نگهداری — در حین به‌روزرسانی/توقف عمدی"],
    ["C:\\uastemdad\\tools\\caddy.exe", "وب‌سرور HTTPS"],
    ["C:\\uastemdad\\run-app.cmd و run-caddy.cmd", "فرمان اجرای واقعی وظایف زمان‌بندی"],
    ["C:\\uastemdad\\restart-app.cmd و restart-caddy.cmd", "ری‌استارت سریع هر بخش"],
  ],
  [40, 60]
));
content.push(body("دستور کمکی برای دنبال‌کردن زندهٔ لاگ در حین عیب‌یابی:", { before: 120 }));
content.push(cmd("Get-Content C:\\uastemdad\\logs\\app.log -Wait -Tail 30"));
content.push(h2("۸-۲. واژه‌های کلیدی این سند"));
content.push(bullet("پایشگر (Watchdog): اسکریپتی که به‌طور دوره‌ای سلامت سامانه را می‌سنجم و در صورت خرابی، خودش اقدام به تعمیر می‌کند."));
content.push(bullet("ضربان (Heartbeat): ثبت زمانی که برنامه هر ۶۰ ثانیه در دیتابیس می‌نویسد «من زنده‌ام»؛ فاصلهٔ دو ضربان، مدت قطعی را نشان می‌دهد."));
content.push(bullet("وظیفهٔ زمان‌بندی (Scheduled Task): مکانیزم ویندوز برای اجرای خودکار اسکریپت‌ها؛ نسخهٔ سبک‌تر «سرویس ویندوز» که نیازی به نصب اضافه ندارد."));
content.push(bullet("Caddy: وب‌سروری که دامنه را به پورت 3003 وصل می‌کند و گواهی امنیتی HTTPS را خودکار تمدید می‌کند."));
content.push(bullet("SQLite: دیتابیس فایل‌محور سامانه؛ کل داده‌ها در یک فایل به نام custom.db نگهداری می‌شود."));
content.push(body(
  "این سند همراه با کد، در پوشهٔ docs مخزن برنامه (فایل‌های RUNBOOK.md و CHECKLIST.md) نیز نگهداری می‌شود؛ پس از هر تغییر در اسکریپت‌های عملیاتی، نسخهٔ متنی هم در همان کامیت به‌روز می‌شود تا راهنما همیشه مطابق واقعیت سرور باشد.",
  { before: 120 }
));

/* ================================================================ document */
const doc = new Document({
  creator: "uastemdad ops",
  title: "راهنمای عملیات، پایش و عیب‌یابی سامانه",
  styles: {
    default: {
      document: {
        run: { font: FA, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: FA, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 360, after: 160, line: 380 } },
      },
      heading2: {
        run: { font: FA, size: 28, bold: true, color: P.primary },
        paragraph: { spacing: { before: 240, after: 120, line: 340 } },
      },
      heading3: {
        run: { font: FA, size: 24, bold: true, color: P.primary },
        paragraph: { spacing: { before: 200, after: 100, line: 320 } },
      },
    },
  },
  sections: [
    /* ---- بخش ۱: جلد ---- */
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1RTL({
        englishLabel: "OPERATIONS RUNBOOK",
        titleLines: ["راهنمای عملیات، پایش", "و عیب‌یابی سامانه"],
        subtitle: "مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره)  |  uastemdad.ir",
        metaLines: [
          "دامنه: https://uastemdad.ir  —  سرور: ویندوز (94.182.131.94)، پورت 3003",
          "اطلاع‌رسانی خودکار: بات بله (@Universityemdad_bot)",
          "پایش هر ۱ دقیقه + راه‌اندازی مجدد خودکار تا ۳ بار",
          "نسخهٔ سند: ۱٫۰ — آذر ۱۴۰۵",
        ],
        footerText: "سند داخلی مدیریت سامانه — نسخهٔ متنی این راهنما در پوشهٔ docs کد برنامه نگهداری می‌شود",
      }),
    },
    /* ---- بخش ۲: فهرست (رومی) ---- */
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      footers: { default: pageFooter() },
      children: [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360, line: 380, lineRule: "atLeast" },
          children: [R("فهرست مطالب", { size: 32, bold: true, color: P.primary })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200 },
          children: [R("یادآوری: این فهرست با کد فیلد ساخته شده است؛ پس از باز کردن سند در Word، با راست‌کلیک روی فهرست و انتخاب «Update Field» شمارهٔ صفحه‌ها به‌روز می‌شود.", { size: 18, italics: true, color: "888888" })],
        }),
        // نکته: بعد از این بخش، SectionType.NEXT_PAGE خودش صفحه را عوض می‌کند؛
        // PageBreak اضافی در اینجا صفحهٔ خالی می‌سازد (قانون ۱ جلوگیری از صفحهٔ خالی).
      ],
    },
    /* ---- بخش ۳: بدنه (شماره از ۱) ---- */
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: docHeader() },
      footers: { default: pageFooter() },
      children: content,
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  const out = process.argv[2] || "output.docx";
  fs.writeFileSync(out, buf);
  console.log("docx written:", out, buf.length, "bytes");
});
