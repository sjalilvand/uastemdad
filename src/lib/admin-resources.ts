// پیکربندی منابع قابل مدیریت در پنل ادمین — مشترک بین کلاینت و سرور
export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "boolean"
  | "select"
  | "image"
  | "color";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  span?: 1 | 2;
  options?: { value: string; label: string }[];
  optionsResource?: string; // برای انتخاب‌های داینامیک (مثل دسته‌بندی)
  optionsLabelField?: string;
  defaultValue?: string | number | boolean;
}

export interface ListColumn {
  name: string;
  label: string;
  type?: "text" | "image" | "badge" | "bool" | "date" | "number";
}

export interface ResourceDef {
  key: string;
  label: string;
  singular: string;
  icon: string;
  titleField: string;
  fields: FieldDef[];
  listColumns: ListColumn[];
  searchable: string[];
  description?: string;
}

const BOOL = (name: string, label: string, defaultValue = true): FieldDef => ({
  name,
  label,
  type: "boolean",
  defaultValue,
});

export const RESOURCES: ResourceDef[] = [
  {
    key: "posts",
    label: "اخبار و اطلاعیه‌ها",
    singular: "خبر / اطلاعیه",
    icon: "newspaper",
    titleField: "title",
    description: "مدیریت اخبار مرکز و اطلاعیه‌های رسمی",
    searchable: ["title", "excerpt"],
    listColumns: [
      { name: "coverImage", label: "تصویر", type: "image" },
      { name: "title", label: "عنوان" },
      { name: "type", label: "نوع", type: "badge" },
      { name: "featured", label: "ویژه", type: "bool" },
      { name: "published", label: "منتشرشده", type: "bool" },
      { name: "views", label: "بازدید", type: "number" },
      { name: "publishedAt", label: "تاریخ", type: "date" },
    ],
    fields: [
      { name: "title", label: "عنوان", type: "text", required: true, span: 2 },
      {
        name: "slug",
        label: "نامک (اختیاری)",
        type: "text",
        help: "در صورت خالی بودن به‌صورت خودکار ساخته می‌شود",
      },
      { name: "coverImage", label: "تصویر شاخص", type: "image" },
      { name: "excerpt", label: "خلاصه", type: "textarea", span: 2 },
      { name: "content", label: "متن کامل", type: "richtext", span: 2 },
      {
        name: "categoryId",
        label: "دسته‌بندی",
        type: "select",
        optionsResource: "categories",
        optionsLabelField: "name",
      },
      {
        name: "type",
        label: "نوع",
        type: "select",
        options: [
          { value: "NEWS", label: "خبر" },
          { value: "ANNOUNCEMENT", label: "اطلاعیه" },
        ],
        defaultValue: "NEWS",
      },
      { name: "featured", label: "نمایش در اسلایدر صفحه اصلی", type: "boolean" },
      { name: "published", label: "منتشر شده", type: "boolean" },
      {
        name: "titleEn",
        label: "عنوان انگلیسی (اختیاری)",
        type: "text",
        span: 2,
        help: "نمایش خودکار این نسخه وقتی زبان سایت انگلیسی است",
      },
      { name: "excerptEn", label: "خلاصه انگلیسی", type: "textarea", span: 2 },
      { name: "contentEn", label: "متن کامل انگلیسی (HTML)", type: "textarea", span: 2 },
      { name: "titleAr", label: "عنوان عربی (اختیاری)", type: "text", span: 2 },
      { name: "excerptAr", label: "خلاصه عربی", type: "textarea", span: 2 },
      { name: "contentAr", label: "متن کامل عربی (HTML)", type: "textarea", span: 2 },
    ],
  },
  {
    key: "pages",
    label: "صفحات",
    singular: "صفحه",
    icon: "files",
    titleField: "title",
    description: "مدیریت صفحات ثابت سایت مانند تاریخچه، درباره ما و راهنمای طبقات",
    searchable: ["title", "content"],
    listColumns: [
      { name: "title", label: "عنوان" },
      { name: "slug", label: "نامک" },
      { name: "showInMenu", label: "در منو", type: "bool" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "published", label: "منتشرشده", type: "bool" },
    ],
    fields: [
      { name: "title", label: "عنوان", type: "text", required: true },
      { name: "slug", label: "نامک", type: "text", help: "آدرس صفحه: /p/نامک" },
      { name: "excerpt", label: "خلاصه (زیر عنوان)", type: "textarea", span: 2 },
      { name: "content", label: "محتوا", type: "richtext", span: 2 },
      { name: "icon", label: "نام آیکن (Lucide)", type: "text", defaultValue: "file-text" },
      { name: "image", label: "تصویر", type: "image" },
      { name: "showInMenu", label: "نمایش در منوی سایت", type: "boolean" },
      {
        name: "menuGroup",
        label: "گروه منو",
        type: "select",
        options: [
          { value: "about", label: "درباره مرکز" },
          { value: "general", label: "منوی اصلی" },
        ],
        defaultValue: "about",
      },
      { name: "order", label: "ترتیب نمایش", type: "number", defaultValue: 0 },
      { name: "published", label: "منتشر شده", type: "boolean" },
      {
        name: "titleEn",
        label: "عنوان انگلیسی (اختیاری)",
        type: "text",
        span: 2,
      },
      { name: "excerptEn", label: "خلاصه انگلیسی", type: "textarea", span: 2 },
      { name: "contentEn", label: "محتوای انگلیسی (HTML)", type: "textarea", span: 2 },
      { name: "titleAr", label: "عنوان عربی (اختیاری)", type: "text", span: 2 },
      { name: "excerptAr", label: "خلاصه عربی", type: "textarea", span: 2 },
      { name: "contentAr", label: "محتوای عربی (HTML)", type: "textarea", span: 2 },
    ],
  },
  {
    key: "categories",
    label: "دسته‌بندی‌ها",
    singular: "دسته‌بندی",
    icon: "tags",
    titleField: "name",
    searchable: ["name"],
    listColumns: [
      { name: "name", label: "نام" },
      { name: "slug", label: "نامک" },
      { name: "color", label: "رنگ" },
    ],
    fields: [
      { name: "name", label: "نام", type: "text", required: true },
      { name: "slug", label: "نامک", type: "text" },
      { name: "color", label: "رنگ", type: "color", defaultValue: "#0B5D51" },
    ],
  },
  {
    key: "slides",
    label: "اسلایدر صفحه اصلی",
    singular: "اسلاید",
    icon: "images",
    titleField: "title",
    searchable: ["title"],
    listColumns: [
      { name: "imageUrl", label: "تصویر", type: "image" },
      { name: "title", label: "عنوان" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "isActive", label: "فعال", type: "bool" },
    ],
    fields: [
      { name: "title", label: "عنوان", type: "text", required: true, span: 2 },
      { name: "subtitle", label: "زیرعنوان", type: "textarea", span: 2 },
      { name: "imageUrl", label: "تصویر اسلاید", type: "image", required: true },
      { name: "linkUrl", label: "لینک (اختیاری)", type: "text" },
      { name: "order", label: "ترتیب", type: "number", defaultValue: 0 },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
  {
    key: "systems",
    label: "سامانه‌ها",
    singular: "سامانه",
    icon: "monitor",
    titleField: "title",
    description: "سامانه‌های بیرونی مانند سما لایو، هم‌آوا و سجاد",
    searchable: ["title", "url"],
    listColumns: [
      { name: "title", label: "عنوان" },
      { name: "url", label: "آدرس" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "isActive", label: "فعال", type: "bool" },
    ],
    fields: [
      { name: "title", label: "عنوان", type: "text", required: true },
      { name: "url", label: "آدرس سامانه", type: "text", required: true },
      { name: "description", label: "توضیح", type: "textarea", span: 2 },
      { name: "icon", label: "نام آیکن (Lucide)", type: "text", defaultValue: "monitor" },
      { name: "color", label: "رنگ", type: "color", defaultValue: "#0B5D51" },
      { name: "order", label: "ترتیب", type: "number", defaultValue: 0 },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
  {
    key: "programs",
    label: "رشته‌های تحصیلی",
    singular: "رشته",
    icon: "graduation-cap",
    titleField: "title",
    searchable: ["title", "description"],
    listColumns: [
      { name: "title", label: "عنوان" },
      { name: "degree", label: "مقطع", type: "badge" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "isActive", label: "فعال", type: "bool" },
    ],
    fields: [
      { name: "title", label: "عنوان رشته", type: "text", required: true, span: 2 },
      {
        name: "degree",
        label: "مقطع",
        type: "select",
        options: [
          { value: "کاردانی حرفه‌ای", label: "کاردانی حرفه‌ای" },
          { value: "کارشناسی حرفه‌ای", label: "کارشناسی حرفه‌ای" },
        ],
        defaultValue: "کاردانی حرفه‌ای",
      },
      { name: "order", label: "ترتیب", type: "number", defaultValue: 0 },
      { name: "description", label: "توضیحات", type: "textarea", span: 2 },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
  {
    key: "documents",
    label: "فرم‌ها و آیین‌نامه‌ها",
    singular: "فرم / آیین‌نامه",
    icon: "folder-open",
    titleField: "title",
    searchable: ["title", "description"],
    listColumns: [
      { name: "title", label: "عنوان" },
      { name: "category", label: "گروه", type: "badge" },
      { name: "createdAt", label: "تاریخ", type: "date" },
    ],
    fields: [
      { name: "title", label: "عنوان", type: "text", required: true, span: 2 },
      {
        name: "category",
        label: "گروه",
        type: "select",
        options: [
          { value: "فرم‌های حقوقی", label: "فرم‌های حقوقی" },
          { value: "آیین‌نامه‌های آموزشی", label: "آیین‌نامه‌های آموزشی" },
          { value: "آیین‌نامه‌های پژوهشی", label: "آیین‌نامه‌های پژوهشی" },
          { value: "آیین‌نامه‌های فناوری اطلاعات", label: "آیین‌نامه‌های فناوری اطلاعات" },
          { value: "فرم‌های آموزشی", label: "فرم‌های آموزشی" },
        ],
        defaultValue: "فرم‌های آموزشی",
      },
      {
        name: "fileUrl",
        label: "لینک فایل",
        type: "text",
        help: "آدرس اینترنتی فایل PDF یا فایل آپلودشده در /uploads",
      },
      { name: "description", label: "توضیحات", type: "textarea", span: 2 },
    ],
  },
  {
    key: "gallery",
    label: "گالری تصاویر",
    singular: "تصویر گالری",
    icon: "image",
    titleField: "title",
    searchable: ["title"],
    listColumns: [
      { name: "imageUrl", label: "تصویر", type: "image" },
      { name: "title", label: "عنوان" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "isActive", label: "فعال", type: "bool" },
    ],
    fields: [
      { name: "title", label: "عنوان", type: "text", required: true, span: 2 },
      { name: "imageUrl", label: "تصویر", type: "image", required: true },
      { name: "order", label: "ترتیب", type: "number", defaultValue: 0 },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
  {
    key: "team",
    label: "هیئت امنا و همکاران",
    singular: "عضو",
    icon: "users",
    titleField: "name",
    description: "هیئت امنا، ریاست، همکاران مرکز و مدیران گروه‌ها",
    searchable: ["name", "role"],
    listColumns: [
      { name: "photo", label: "تصویر", type: "image" },
      { name: "name", label: "نام" },
      { name: "role", label: "سمت" },
      { name: "group", label: "گروه", type: "badge" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "isActive", label: "فعال", type: "bool" },
    ],
    fields: [
      { name: "name", label: "نام و نام خانوادگی", type: "text", required: true, span: 2 },
      { name: "role", label: "سمت", type: "text" },
      {
        name: "group",
        label: "گروه",
        type: "select",
        options: [
          { value: "board", label: "هیئت امنا" },
          { value: "president", label: "ریاست مرکز" },
          { value: "staff", label: "همکاران مرکز" },
          { value: "managers", label: "مدیران گروه‌ها" },
        ],
        defaultValue: "staff",
      },
      { name: "photo", label: "تصویر پرسنلی", type: "image" },
      { name: "bio", label: "معرفی / سوابق", type: "textarea", span: 2 },
      { name: "order", label: "ترتیب", type: "number", defaultValue: 0 },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
  {
    key: "links",
    label: "پیوندهای مرتبط",
    singular: "پیوند",
    icon: "link",
    titleField: "title",
    searchable: ["title", "url"],
    listColumns: [
      { name: "title", label: "عنوان" },
      { name: "url", label: "آدرس" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "isActive", label: "فعال", type: "bool" },
    ],
    fields: [
      { name: "title", label: "عنوان", type: "text", required: true },
      { name: "url", label: "آدرس", type: "text", required: true },
      { name: "order", label: "ترتیب", type: "number", defaultValue: 0 },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
  {
    key: "newsletter",
    label: "مشترکان خبرنامه",
    singular: "مشترک",
    icon: "mail",
    titleField: "email",
    description: "فهرست ایمیل‌های عضو خبرنامه سایت",
    searchable: ["email", "name"],
    listColumns: [
      { name: "email", label: "ایمیل" },
      { name: "name", label: "نام" },
      { name: "isActive", label: "فعال", type: "bool" },
      { name: "createdAt", label: "تاریخ عضویت", type: "date" },
    ],
    fields: [
      { name: "email", label: "ایمیل", type: "text", required: true },
      { name: "name", label: "نام (اختیاری)", type: "text" },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
  {
    key: "menus",
    label: "منوهای سایت",
    singular: "آیتم منو",
    icon: "list-tree",
    titleField: "label",
    description: "ساختار منوی اصلی و منوی سریع سربرگ سایت",
    searchable: ["label", "url"],
    listColumns: [
      { name: "label", label: "عنوان" },
      { name: "url", label: "آدرس" },
      { name: "location", label: "محل", type: "badge" },
      { name: "order", label: "ترتیب", type: "number" },
      { name: "isActive", label: "فعال", type: "bool" },
    ],
    fields: [
      { name: "label", label: "عنوان", type: "text", required: true },
      { name: "url", label: "آدرس", type: "text", required: true, defaultValue: "/" },
      {
        name: "location",
        label: "محل نمایش",
        type: "select",
        options: [
          { value: "main", label: "منوی اصلی" },
          { value: "quick", label: "منوی سریع (بالای سربرگ)" },
        ],
        defaultValue: "main",
      },
      {
        name: "parentId",
        label: "آیتم والد",
        type: "select",
        optionsResource: "menus",
        optionsLabelField: "label",
      },
      { name: "order", label: "ترتیب", type: "number", defaultValue: 0 },
      { name: "isActive", label: "فعال", type: "boolean" },
    ],
  },
];

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((r) => r.key === key);
}

/** پرسیج‌کردن مقدار بر اساس نوع فیلد قبل از ذخیره در دیتابیس */
export function coerceField(field: FieldDef, value: unknown): unknown {
  if (value === undefined || value === null) {
    if (field.type === "boolean") return field.defaultValue ?? true;
    if (field.type === "number") return field.defaultValue ?? 0;
    return "";
  }
  switch (field.type) {
    case "boolean":
      return value === true || value === "true" || value === 1 || value === "1";
    case "number":
      return Number(value) || 0;
    default:
      return String(value);
  }
}
