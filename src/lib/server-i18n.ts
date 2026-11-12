import "server-only";
import { cookies } from "next/headers";
import { DICTS, type Locale } from "./i18n-dictionaries";
import { translateBatch, isTargetLocale } from "./translate";

/** زبان فعال از کوکی (توسط SitePrefsProvider تنظیم می‌شود) */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get("uast_locale")?.value || "fa";
  return (["fa", "en", "ar"].includes(v) ? v : "fa") as Locale;
}

/** تابع ترجمهٔ سمت سرور بر پایهٔ فرهنگ‌ها */
export function serverT(locale: Locale) {
  return (key: string, fallback?: string): string =>
    DICTS[locale]?.[key] ?? DICTS.fa[key] ?? fallback ?? key;
}

interface LocalizablePost {
  id: string;
  title: string;
  excerpt: string;
  [key: string]: unknown;
}

/** جایگزینی عنوان/چکیدهٔ پست‌ها با ترجمهٔ آنلاین (فقط en/ar؛ فارسی بدون تغییر) */
export async function localizePosts<T extends LocalizablePost>(
  posts: T[],
  locale: Locale
): Promise<T[]> {
  if (locale === "fa" || !isTargetLocale(locale) || posts.length === 0) return posts;
  const texts = posts.flatMap((p) => [p.title, p.excerpt]).filter((s) => s && s.trim());
  const map = await translateBatch(texts, locale);
  return posts.map((p) => ({
    ...p,
    title: map.get(p.title.trim()) || p.title,
    excerpt: map.get(p.excerpt.trim()) || p.excerpt,
  }));
}

/** ترجمهٔ فهرست رشته‌های متنی ساده */
export async function localizeStrings(items: string[], locale: Locale): Promise<string[]> {
  if (locale === "fa" || !isTargetLocale(locale)) return items;
  const map = await translateBatch(items.filter((s) => s && s.trim()), locale);
  return items.map((s) => map.get(s.trim()) || s);
}

/** ترجمهٔ نگاشت رشته‌به‌رشته (مثلاً عنوان منوها) */
export async function localizeRecord(
  items: { id: string; text: string }[],
  locale: Locale
): Promise<Map<string, string>> {
  if (locale === "fa" || !isTargetLocale(locale)) return new Map();
  const map = await translateBatch(
    items.map((i) => i.text).filter((s) => s && s.trim()),
    locale
  );
  const out = new Map<string, string>();
  for (const i of items) {
    out.set(i.id, map.get(i.text.trim()) || i.text);
  }
  return out;
}
