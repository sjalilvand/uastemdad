import { formatDate } from "@/lib/jalali";

/** حذف کاراکترهای HTML برای جلوگیری از تزریق در متن پیام‌های بات */
export function esc(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** تبدیل متن سادهٔ چندپاراگرافی به HTML امن با پاراگراف‌ها (برای ذخیره در Post.content) */
export function textToHtml(input: string): string {
  const raw = String(input || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p>${esc(p)
          .replace(/\n/g, "<br/>")
          .replace(/«([^»]+)»/g, "«<strong>$1</strong>»")}</p>`
    );
  return paragraphs.join("\n");
}

/** برش متن بلند برای پیام‌های بات (سقف پیام بله حدود ۴۰۹۶ کاراکتر است) */
export function clip(s: string, max = 3500): string {
  const t = String(s || "");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** تبدیل عدد به رقم فارسی */
export function faNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** تاریخ شمسی برای نمایش در بات */
export function faDate(d: Date | string): string {
  try {
    return formatDate(new Date(d), "fa");
  } catch {
    return "";
  }
}

export function fullName(u?: { first_name?: string; last_name?: string }): string {
  if (!u) return "";
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || "کاربر بله";
}
