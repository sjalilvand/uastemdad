import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { getLocale, serverT } from "@/lib/server-i18n";
import { pickLocalizedAuto } from "@/lib/translate";
import { toFa } from "@/lib/jalali";
import { GraduationCap, BookOpen, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "رشته‌های تحصیلی" };

export default async function ProgramsPage() {
  const locale = await getLocale();
  const T = serverT(locale);
  const [programs, settings] = await Promise.all([
    db.program.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    getSettings(),
  ]);

  const localized = await Promise.all(
    programs.map(async (p) => ({
      ...p,
      title:
        locale === "en"
          ? p.titleEn.trim() || p.title
          : locale === "ar"
            ? p.titleAr.trim() || p.title
            : p.title,
      description:
        locale === "fa"
          ? p.description
          : (await pickLocalizedAuto(p as unknown as Record<string, unknown>, "description", locale)) ||
            p.description,
    }))
  );

  return (
    <>
      <PageHeader
        title={T("programs.title", "رشته‌های تحصیلی مرکز")}
        subtitle={T(
          "programs.subtitle",
          "مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره) در مقاطع کاردانی حرفه‌ای و کارشناسی حرفه‌ای دانشجو می‌پذیرد"
        )}
        breadcrumb={[{ label: T("top.programs") }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {localized.map((p, i) => (
            <div
              key={p.id}
              className="group bg-card rounded-2xl border border-border shadow-sm hover-lift overflow-hidden"
            >
              <div className="emerald-gradient pattern-bg p-6 relative">
                <div className="h-12 w-12 rounded-xl gold-gradient flex items-center justify-center mb-4">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div className="text-white font-extrabold leading-8">
                  {p.title}
                </div>
                <span className="mt-3 inline-block rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold px-3 py-1">
                  {p.degree}
                </span>
                <span className="absolute top-5 left-5 text-white/20 text-5xl font-extrabold select-none">
                  {locale === "fa" ? toFa(String(i + 1).padStart(2, "0")) : String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground leading-7 text-justify">
                  {p.description}
                </p>
              </div>
            </div>
          ))}

          {programs.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              {T("programs.empty", "رشته‌ای ثبت نشده است")}
            </div>
          )}
        </div>

        {/* نوار ثبت‌نام */}
        <div className="mt-12 rounded-3xl border border-gold/30 bg-gold/5 p-8 md:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className="h-16 w-16 rounded-2xl gold-gradient flex items-center justify-center shrink-0">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 text-center md:text-right">
            <h3 className="font-extrabold text-lg text-foreground">
              {T("programs.registerTitle", "ثبت‌نام سال تحصیلی جدید")}
            </h3>
            <p className="text-sm text-muted-foreground leading-7 mt-2">
              {T(
                "programs.registerBody",
                "برای اطلاع از زمان و شرایط ثبت‌نام، آخرین اطلاعیه‌ها را دنبال کنید یا با دفتر مرکز تماس بگیرید."
              )}
            </p>
          </div>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-bold hover:bg-primary/90 transition-colors shrink-0"
          >
            <Phone className="h-4 w-4" />
            {T("top.contact")}
          </a>
        </div>
      </div>
    </>
  );
}
