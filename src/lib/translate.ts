import "server-only";
import { createHash } from "crypto";
import { db } from "./db";
import type { Locale } from "./i18n-dictionaries";

/**
 * ترجمهٔ آنلاین متن و محتوای صفحات (فارسی → انگلیسی/عربی)
 *
 * - زنجیرهٔ سرویس‌ها: Google (dict-chrome-ex) → Google (gtx) → MyMemory
 * - کش دو لایه: حافظه (سریع) + دیتابیس SQLite (ماندگار بین اجراها)
 * - در صورت در دسترس نبودن همهٔ سرویس‌ها، متن اصلی (فارسی) برگردانده می‌شود
 *   تا صفحه همیشه نمایش داده شود.
 * - پشتیبانی از HTML: تگ‌ها دست‌نخورده می‌مانند و فقط گره‌های متنی ترجمه می‌شوند.
 */

export type TargetLang = "en" | "ar";

const TARGETS: TargetLang[] = ["en", "ar"];

export function isTargetLocale(l: string): l is TargetLang {
  return (TARGETS as string[]).includes(l);
}

/* ------------------------------------------------------------------ */
/* کش حافظه + درخواست‌های در جریان                                     */
/* ------------------------------------------------------------------ */

const MEM_TTL = 1000 * 60 * 60 * 6; // ۶ ساعت
const memCache = new Map<string, { value: string; at: number }>();
const pending = new Map<string, Promise<string | null>>();

function memKey(source: string, target: TargetLang) {
  return `${target}:${createHash("sha1").update(source).digest("hex")}`;
}

function memGet(key: string): string | null | undefined {
  const hit = memCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > MEM_TTL) {
    memCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

/* ------------------------------------------------------------------ */
/* سرویس‌های ترجمه                                                     */
/* ------------------------------------------------------------------ */

const TIMEOUT = 9000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/* فاصلهٔ حداقلی بین درخواست‌های متوالی به هر سرویس بیرونی —
   جلوگیری از 429 (محدودیت نرخ) سرویس‌های رایگان */
let lastCall = 0;
async function throttle(minGapMs: number) {
  const now = Date.now();
  const wait = lastCall + minGapMs - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function fetchText(
  url: string,
  init?: RequestInit,
  opts?: { gapMs?: number; retries?: number }
): Promise<string | null> {
  const retries = opts?.retries ?? 1;
  const gapMs = opts?.gapMs ?? 1100;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle(gapMs);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": UA, ...(init?.headers || {}) },
        signal: AbortSignal.timeout(TIMEOUT),
        cache: "no-store",
      });
      if (res.status === 429 || res.status === 503) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      return await res.text();
    } catch {
      if (attempt >= retries) return null;
    }
  }
  return null;
}

/** Google translate_a/t با کلاینت dict-chrome-ex — خروجی: آرایهٔ رشته */
async function googleDict(text: string, target: TargetLang): Promise<string | null> {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=fa&tl=${target}&q=${encodeURIComponent(text)}`;
  const body = await fetchText(url);
  if (!body) return null;
  try {
    const data = JSON.parse(body);
    if (Array.isArray(data)) {
      const joined = data
        .map((seg) =>
          typeof seg === "string"
            ? seg
            : Array.isArray(seg) && typeof seg[0] === "string"
              ? seg[0]
              : ""
        )
        .filter(Boolean)
        .join("");
      return joined.trim() ? joined : null;
    }
    if (typeof data === "string" && data.trim()) return data;
    return null;
  } catch {
    return null;
  }
}

/** Google gtx کلاسیک — خروجی: [[["ترجمه","اصلی",...],...],...] */
async function googleGtx(text: string, target: TargetLang): Promise<string | null> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fa&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const body = await fetchText(url);
  if (!body) return null;
  try {
    const data = JSON.parse(body);
    const segs = Array.isArray(data?.[0]) ? data[0] : null;
    if (!segs) return null;
    const joined = segs
      .map((s: unknown[]) => (Array.isArray(s) && typeof s[0] === "string" ? s[0] : ""))
      .join("");
    return joined.trim() ? joined : null;
  } catch {
    return null;
  }
}

/** MyMemory — محدودیت روزانهٔ حجم دارد؛ متن را به قطعات کوچک تقسیم می‌کنیم */
async function myMemory(text: string, target: TargetLang): Promise<string | null> {
  const chunks = splitForRequest(text, 440);
  const out: string[] = [];
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=fa|${target}`;
    const body = await fetchText(url, undefined, { retries: 0, gapMs: 700 });
    if (!body) return null;
    try {
      const data = JSON.parse(body) as { responseData?: { translatedText?: string } };
      const t = data?.responseData?.translatedText || "";
      if (!t || /MYMEMORY WARNING/i.test(t)) return null;
      out.push(t);
    } catch {
      return null;
    }
  }
  const joined = out.join(" ");
  return joined.trim() ? joined : null;
}

/** ترجمه با مدل زبانی Z.ai — آخرین پشتیبان؛ در نبود پیکربندی بی‌صدا رد می‌شود */
async function zaiTranslate(text: string, target: TargetLang): Promise<string | null> {
  if (text.length > 1500) return null;
  try {
    const mod = await import("z-ai-web-dev-sdk");
    const ZAI = (mod as { default?: unknown }).default ?? mod;
    const zai = await (ZAI as { create: () => Promise<unknown> }).create();
    const chat = (zai as {
      chat: { completions: { create: (args: unknown) => Promise<{
        choices?: { message?: { content?: string } }[];
      }> } };
    }).chat;
    const langName = target === "en" ? "English" : "Arabic";
    const completion = await chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional Persian-to-${langName} translator for a university website. Reply ONLY with the translation, nothing else.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      thinking: { type: "disabled" },
    });
    const out = completion.choices?.[0]?.message?.content?.trim();
    return out && out !== text ? out : null;
  } catch {
    return null;
  }
}

/* مدارشکن: سرویسی که پشت‌سرهم شکست خورده تا ۶۰ ثانیه کنار گذاشته می‌شود */
const breaker = new Map<string, { fails: number; until: number }>();
function breakerOpen(name: string): boolean {
  const b = breaker.get(name);
  return !!b && b.until > Date.now();
}
function recordFail(name: string) {
  const b = breaker.get(name) || { fails: 0, until: 0 };
  b.fails += 1;
  if (b.fails >= 3) {
    b.until = Date.now() + 60_000;
    b.fails = 0;
  }
  breaker.set(name, b);
}
function recordSuccess(name: string) {
  breaker.delete(name);
}

const PROVIDERS: {
  name: string;
  fn: (text: string, target: TargetLang) => Promise<string | null>;
}[] = [
  { name: "google-dict", fn: googleDict },
  { name: "google-gtx", fn: googleGtx },
  { name: "mymemory", fn: myMemory },
  { name: "zai", fn: zaiTranslate },
];

/* ------------------------------------------------------------------ */
/* تقسیم متن بلند برای درخواست‌ها                                      */
/* ------------------------------------------------------------------ */

/** تقسیم متن به قطعات ≤ max روی مرز جمله/ویرگول — بدون شکستن کلمه */
function splitForRequest(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = -1;
    for (const ch of ["\n", ".", "۔", "!", "؟", "?", "؛", ";", "،", ",", " "]) {
      const idx = rest.lastIndexOf(ch, max);
      if (idx > max * 0.4) {
        cut = idx + 1;
        break;
      }
    }
    if (cut <= 0) cut = max;
    pieces.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) pieces.push(rest);
  return pieces;
}

/* ------------------------------------------------------------------ */
/* دیسک (SQLite)                                                       */
/* ------------------------------------------------------------------ */

async function dbGet(source: string, target: TargetLang): Promise<string | null> {
  try {
    const row = await db.translationCache.findUnique({
      where: { hash_target: { hash: sha256(source), target } },
    });
    return row?.result ?? null;
  } catch {
    return null;
  }
}

async function dbPut(source: string, target: TargetLang, result: string) {
  try {
    await db.translationCache.upsert({
      where: { hash_target: { hash: sha256(source), target } },
      update: { result, hits: { increment: 1 } },
      create: { hash: sha256(source), target, source, result },
    });
  } catch {
    /* کش اختیاری است */
  }
}

/* ------------------------------------------------------------------ */
/* API عمومی                                                           */
/* ------------------------------------------------------------------ */

/** ترجمهٔ یک رشتهٔ ساده (متن خالص) */
export async function translateString(
  source: string,
  target: TargetLang
): Promise<string | null> {
  const text = (source || "").trim();
  if (!text) return null;
  // متن‌های بدون حروف فارسی (اعداد، لاتین) نیازی به ترجمه ندارند
  if (!/[\u0600-\u06FF]/.test(text)) return null;

  const key = memKey(text, target);
  const cached = memGet(key);
  if (cached !== undefined) return cached;

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const job = (async () => {
    const fromDb = await dbGet(text, target);
    if (fromDb) {
      memCache.set(key, { value: fromDb, at: Date.now() });
      return fromDb;
    }
    for (const provider of PROVIDERS) {
      if (breakerOpen(provider.name)) continue;
      const result = await provider.fn(text, target);
      if (result && result.trim() && result.trim() !== text) {
        recordSuccess(provider.name);
        memCache.set(key, { value: result, at: Date.now() });
        void dbPut(text, target, result);
        return result;
      }
      if (result && result.trim() === text) {
        // سرویس متن را بازگرداند اما تغییری نکرده؛ بی‌خیال سرویس‌های بعدی
        recordSuccess(provider.name);
        memCache.set(key, { value: text, at: Date.now() });
        return text;
      }
      recordFail(provider.name);
    }
    return null; // ناموفق → متن اصلی نمایش داده می‌شود
  })().finally(() => pending.delete(key));

  pending.set(key, job);
  return job;
}

/** ترجمهٔ دسته‌ای با حذف تکراری‌ها و محدودیت هم‌زمانی */
export async function translateBatch(
  texts: string[],
  target: TargetLang
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(texts.map((t) => (t || "").trim()).filter(Boolean)));
  const CONCURRENCY = 6;
  let idx = 0;
  async function worker() {
    while (idx < unique.length) {
      const i = idx++;
      const text = unique[i];
      const res = await translateString(text, target);
      if (res) out.set(text, res);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker));
  return out;
}

/* ------------------------------------------------------------------ */
/* ترجمهٔ HTML با حفظ تگ‌ها                                            */
/* ------------------------------------------------------------------ */

const SKIP_TAGS = new Set(["script", "style", "code", "pre", "noscript"]);

/**
 * HTML ورودی را به توکن‌های تگ/متن می‌شکند، گره‌های متنی را
 * دسته‌ای ترجمه می‌کند و HTML معادل می‌سازد.
 */
export async function translateHtml(html: string, target: TargetLang): Promise<string | null> {
  if (!html || !/[\u0600-\u06FF]/.test(html)) return null;

  // کش کل HTML — اگر قبلاً ترجمه شده، همان را برگردان
  const wholeKey = memKey(`html:${html}`, target);
  const wholeCached = memGet(wholeKey);
  if (wholeCached !== undefined) return wholeCached;
  const wholeDb = await dbGet(`html:${html}`, target);
  if (wholeDb) {
    memCache.set(wholeKey, { value: wholeDb, at: Date.now() });
    return wholeDb;
  }

  // شکستن به تگ و متن
  const tokens = html.split(/(<[^>]+>)/g).filter((t) => t !== "");
  const skipStack: string[] = [];
  const textNodes: { idx: number; text: string }[] = [];

  tokens.forEach((tok, idx) => {
    if (tok.startsWith("<")) {
      const m = tok.match(/^<\/?\s*([a-zA-Z0-9-]+)/);
      if (m) {
        const tag = m[1].toLowerCase();
        if (SKIP_TAGS.has(tag)) {
          if (!tok.startsWith("</")) skipStack.push(tag);
          else {
            const i = skipStack.lastIndexOf(tag);
            if (i !== -1) skipStack.splice(i, 1);
          }
        }
      }
      return;
    }
    if (skipStack.length > 0) return;
    const decoded = tok.replace(/&nbsp;/g, " ");
    if (!/[\u0600-\u06FF]/.test(decoded)) return;
    const trimmed = decoded.trim();
    if (!trimmed) return;
    textNodes.push({ idx, text: trimmed });
  });

  if (textNodes.length === 0) return null;

  const translated = await translateBatch(
    textNodes.map((n) => n.text),
    target
  );

  let changed = 0;
  for (const node of textNodes) {
    const tr = translated.get(node.text);
    if (tr && tr !== node.text) {
      // جایگزینی متن با حفظ فاصله‌های ابتدا/انتهای توکن اصلی
      const original = tokens[node.idx];
      const lead = original.match(/^\s*/)?.[0] ?? "";
      const trail = original.match(/\s*$/)?.[0] ?? "";
      tokens[node.idx] = lead + tr + trail;
      changed++;
    }
  }

  if (changed === 0) return null;
  const result = tokens.join("");
  memCache.set(wholeKey, { value: result, at: Date.now() });
  void dbPut(`html:${html}`, target, result);
  return result;
}

/** انتخاب فیلد چندزبانه با ترجمهٔ آنلاین — برای استفاده در کامپوننت‌های سروری */
export async function pickLocalizedAuto(
  item: Record<string, unknown>,
  base: string,
  locale: Locale
): Promise<string> {
  const original = typeof item[base] === "string" ? (item[base] as string) : "";
  if (locale === "fa" || !original.trim()) return original;

  // ترجمهٔ دستی ثبت‌شده در پنل مدیریت مقدم است
  const manual = item[`${base}${locale === "en" ? "En" : "Ar"}`];
  if (typeof manual === "string" && manual.trim()) return manual;

  if (!isTargetLocale(locale)) return original;
  const isHtml = /<[a-z][\s\S]*>/i.test(original);
  const translated = isHtml
    ? await translateHtml(original, locale)
    : await translateString(original, locale);
  return translated || original;
}
