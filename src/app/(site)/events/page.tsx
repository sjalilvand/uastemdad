import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { formatJalali } from "@/lib/jalali";
import { CalendarClock, MapPin, CalendarX2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "تقویم رویدادها" };

const CAT_COLORS: Record<string, string> = {
  آموزشی: "#0B5D51",
  فرهنگی: "#C9A227",
  دانشجویی: "#7C5CBF",
  عمومی: "#5B6B66",
};

export default async function EventsPage() {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.event.findMany({
      where: { isActive: true, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 30,
    }),
    db.event.findMany({
      where: { isActive: true, date: { lt: now } },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="تقویم رویدادها"
        subtitle="رویدادهای آموزشی، فرهنگی و زمان‌بندی‌های مهم مرکز"
        breadcrumb={[{ label: "تقویم رویدادها" }]}
      />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
        {upcoming.length === 0 && past.length === 0 && (
          <div className="rounded-2xl bg-secondary/50 border border-dashed border-border p-14 text-center">
            <CalendarX2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              هنوز رویدادی ثبت نشده است؛ رویدادها از پنل مدیریت قابل افزودن هستند.
            </p>
          </div>
        )}

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold section-title-bar mb-6">
              رویدادهای پیش رو
            </h2>
            <ol className="relative border-r-2 border-border/70 pr-6 space-y-5">
              {upcoming.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -right-[31px] top-5 h-3.5 w-3.5 rounded-full border-2 border-gold bg-card" />
                  <div className="bg-card rounded-2xl border border-border shadow-sm p-5 hover-lift">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-primary text-xs font-bold px-3 py-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatJalali(e.date, { withWeekday: true })}
                      </span>
                      <span
                        className="rounded-full text-white text-[10px] font-bold px-2.5 py-1"
                        style={{ backgroundColor: CAT_COLORS[e.category] || CAT_COLORS["عمومی"] }}
                      >
                        {e.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground leading-7">{e.title}</h3>
                    {e.description && (
                      <p className="mt-1.5 text-sm text-muted-foreground leading-7">
                        {e.description}
                      </p>
                    )}
                    {e.location && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-gold" />
                        {e.location}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-base font-extrabold text-muted-foreground mb-5">
              رویدادهای گذشته
            </h2>
            <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden">
              {past.map((e) => (
                <li key={e.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-muted-foreground min-w-36">
                    {formatJalali(e.date)}
                  </span>
                  <span className="text-sm text-foreground/75">{e.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
