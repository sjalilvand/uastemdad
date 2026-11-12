import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { HeroSlider } from "@/components/site/hero-slider";
import { StatsBand } from "@/components/site/stats-band";
import { SectionHeading } from "@/components/site/section-heading";
import { PostCard } from "@/components/site/post-card";
import { toFa, formatJalali } from "@/lib/jalali";
import {
  Monitor,
  CalendarDays,
  Megaphone,
  GraduationCap,
  ArrowLeft,
  Images,
  MessagesSquare,
  Phone,
  MapPin,
  UserRound,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [slides, news, announcements, programs, systems, gallery, president, settings] =
    await Promise.all([
      db.slide.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      db.post.findMany({
        where: { published: true, type: "NEWS" },
        orderBy: { publishedAt: "desc" },
        take: 7,
        include: { category: true },
      }),
      db.post.findMany({
        where: { published: true, type: "ANNOUNCEMENT" },
        orderBy: { publishedAt: "desc" },
        take: 4,
      }),
      db.program.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      db.externalSystem.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        take: 4,
      }),
      db.galleryItem.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        take: 8,
      }),
      db.teamMember.findFirst({
        where: { group: "president", isActive: true },
      }),
      getSettings(),
    ]);

  const [featured, ...restNews] = news;

  return (
    <div className="pb-0">
      {/* اسلایدر */}
      <HeroSlider
        slides={slides.map((s) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          imageUrl: s.imageUrl,
          linkUrl: s.linkUrl,
        }))}
      />

      {/* دسترسی سریع به سامانه‌ها */}
      <div className="relative z-20 -mt-14 px-4">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {systems.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card rounded-2xl border border-border shadow-lg hover-lift p-5 flex items-center gap-4"
            >
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-110"
                style={{ backgroundColor: s.color }}
              >
                <Monitor className="h-5.5 w-5.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {s.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {s.description}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* اخبار و اطلاعیه‌ها */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* ستون اخبار */}
          <div className="lg:col-span-2">
            <SectionHeading
              title="آخرین اخبار مرکز"
              subtitle="رویدادها و گزارش‌های آموزشی، پژوهشی و فرهنگی"
              moreHref="/news"
            />
            {featured && (
              <div className="mb-6">
                <PostCard post={featured} featured />
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {restNews.slice(0, 4).map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>

          {/* ستون کناری */}
          <div className="space-y-6">
            {/* اطلاعیه‌ها */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="emerald-gradient pattern-bg px-5 py-4 flex items-center gap-2.5">
                <Megaphone className="h-5 w-5 text-gold" />
                <h3 className="text-white font-bold">اطلاعیه‌ها</h3>
              </div>
              <ul className="divide-y divide-border/60">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/announcements/${a.slug}`}
                      className="block px-5 py-4 hover:bg-secondary/60 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-gold shrink-0" />
                        <div>
                          <div className="text-sm font-semibold leading-7 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {a.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3" />
                            {formatJalali(a.publishedAt)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
                {announcements.length === 0 && (
                  <li className="px-5 py-6 text-sm text-muted-foreground text-center">
                    اطلاعیه‌ای ثبت نشده است
                  </li>
                )}
              </ul>
              <div className="px-5 py-3 border-t border-border/60">
                <Link
                  href="/announcements"
                  className="text-xs font-bold text-primary hover:text-gold inline-flex items-center gap-1 transition-colors"
                >
                  همه اطلاعیه‌ها
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* ریاست مرکز */}
            {president && (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-6 text-center hover-lift">
                <div className="relative inline-block">
                  <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-gold/30 bg-secondary">
                    <img
                      src={president.photo || settings.presidentPhoto}
                      alt={president.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full gold-gradient flex items-center justify-center ring-4 ring-card">
                    <UserRound className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="mt-4 font-extrabold text-foreground">
                  {president.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ریاست مرکز آموزش علمی–کاربردی کمیته امداد
                </div>
                <Link
                  href="/p/ریاست-مرکز"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-gold transition-colors"
                >
                  معرفی و سوابق
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* رشته‌های تحصیلی (خلاصه) */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">رشته‌های تحصیلی</h3>
              </div>
              <ul className="divide-y divide-border/60">
                {programs.slice(0, 5).map((p) => (
                  <li key={p.id} className="px-5 py-3 text-sm flex items-center justify-between gap-2">
                    <span className="text-foreground/85 font-medium">{p.title}</span>
                    <span className="text-[10px] bg-secondary text-primary rounded-full px-2.5 py-1 shrink-0">
                      {p.degree}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 border-t border-border/60">
                <Link
                  href="/programs"
                  className="text-xs font-bold text-primary hover:text-gold inline-flex items-center gap-1 transition-colors"
                >
                  جزئیات رشته‌ها
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* آمار */}
      <StatsBand stats={settings} />

      {/* گالری */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeading
          title="گالری تصاویر"
          subtitle="گزارش تصویری رویدادها و فضاهای مرکز"
          moreHref="/gallery"
          moreLabel="همه تصاویر"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gallery.map((g, i) => (
            <Link
              key={g.id}
              href="/gallery"
              className={`group relative rounded-2xl overflow-hidden aspect-[4/3] bg-secondary ${
                i % 5 === 0 ? "md:row-span-1" : ""
              }`}
            >
              <img
                src={g.imageUrl}
                alt={g.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 right-0 left-0 p-3 text-white text-xs font-bold translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                {g.title}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* نوار دعوت به گفتگو و تماس */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl emerald-gradient pattern-bg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs text-white mb-4">
                <MessagesSquare className="h-3.5 w-3.5 text-gold" />
                پاسخگویی هوشمند ۲۴ ساعته
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-white leading-relaxed">
                پرسش خود را از دستیار هوشمند مرکز بپرسید
              </h3>
              <p className="mt-3 text-white/70 text-sm leading-8">
                دستیار هوشمند سامانه به اخبار و اطلاعیه‌های مرکز، رشته‌های تحصیلی،
                سامانه‌های آموزشی، فرم‌ها و اطلاعات تماس مسلط است و به‌صورت
                گفت‌وگومحور پاسخ می‌دهد. کافی است روی دکمه گفتگو (پایین صفحه)
                بزنید.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 content-center">
              <div className="rounded-2xl bg-white/8 border border-white/15 p-5 text-white">
                <Phone className="h-6 w-6 text-gold mb-3" />
                <div className="text-sm font-bold mb-1">تلفن‌های تماس</div>
                <div className="text-xs text-white/70 leading-6" dir="ltr">
                  {settings.phones}
                </div>
              </div>
              <div className="rounded-2xl bg-white/8 border border-white/15 p-5 text-white">
                <MapPin className="h-6 w-6 text-gold mb-3" />
                <div className="text-sm font-bold mb-1">آدرس مرکز</div>
                <div className="text-xs text-white/70 leading-6">
                  {settings.address}
                </div>
              </div>
              <Link
                href="/contact"
                className="sm:col-span-2 rounded-2xl gold-gradient p-5 text-accent-foreground flex items-center justify-between font-bold text-sm hover:brightness-110 transition-all"
              >
                فرم ارتباط با مرکز
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
