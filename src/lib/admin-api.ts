import { db } from "@/lib/db";
import {
  getResource,
  coerceField,
  type ResourceDef,
} from "@/lib/admin-resources";

/** نگاشت کلید منبع به دلیگیت پرisma و ترتیب پیش‌فرض */
export function getDelegate(resourceKey: string) {
  const map: Record<
    string,
    {
      delegate: keyof typeof db;
      orderBy?: Record<string, "asc" | "desc">[];
      /** تبدیل داده پیش از ذخیره (مثلاً رشتهٔ تاریخ به Date) */
      beforeSave?: (data: Record<string, unknown>) => Record<string, unknown>;
    }
  > = {
    posts: { delegate: "post", orderBy: [{ publishedAt: "desc" }] },
    pages: { delegate: "page", orderBy: [{ order: "asc" }] },
    categories: { delegate: "category", orderBy: [{ name: "asc" }] },
    slides: { delegate: "slide", orderBy: [{ order: "asc" }] },
    systems: { delegate: "externalSystem", orderBy: [{ order: "asc" }] },
    programs: { delegate: "program", orderBy: [{ order: "asc" }] },
    documents: { delegate: "document", orderBy: [{ createdAt: "desc" }] },
    gallery: { delegate: "galleryItem", orderBy: [{ order: "asc" }] },
    team: { delegate: "teamMember", orderBy: [{ order: "asc" }] },
    links: { delegate: "relatedLink", orderBy: [{ order: "asc" }] },
    menus: {
      delegate: "menuItem",
      orderBy: [{ location: "asc" }, { order: "asc" }],
    },
    newsletter: { delegate: "newsletterSubscriber", orderBy: [{ createdAt: "desc" }] },
    videos: { delegate: "video", orderBy: [{ order: "asc" }] },
    faqs: { delegate: "faq", orderBy: [{ order: "asc" }] },
    events: {
      delegate: "event",
      orderBy: [{ date: "desc" }],
      beforeSave: (data) => {
        if (typeof data.date === "string" && data.date.trim()) {
          const d = new Date(data.date);
          if (!Number.isNaN(d.getTime())) data.date = d;
          else delete data.date;
        }
        return data;
      },
    },
  };
  const entry = map[resourceKey];
  if (!entry) return null;
  const def = getResource(resourceKey);
  if (!def) return null;
  return { delegate: db[entry.delegate], orderBy: entry.orderBy, def, beforeSave: entry.beforeSave };
}

export function slugify(text: string): string {
  const base = String(text || "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .replace(/[\u200c\s]+/g, "-")
    .replace(/[؟?!,،.:؛;«»"'()\[\]{}]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `item-${Date.now().toString(36)}`;
}

/** پاک‌سازی و تبدیل داده ورودی بر اساس پیکربندی فیلدها */
export function sanitizeBody(
  def: ResourceDef,
  body: Record<string, unknown>,
  { partial }: { partial: boolean }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of def.fields) {
    if (partial && !(field.name in body)) continue;
    out[field.name] = coerceField(field, body[field.name]);
    // فیلدهای رابطه‌ای
    if (field.name.endsWith("Id") && (out[field.name] === "" || out[field.name] === undefined)) {
      out[field.name] = null;
    }
  }
  // نامک خودکار
  if ("slug" in out && (out.slug === "" || out.slug === undefined)) {
    const source =
      (body.title as string) || (body.name as string) || (body.label as string) || "";
    out.slug = slugify(source);
  }
  return out;
}
