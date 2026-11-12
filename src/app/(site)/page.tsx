import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { HeroSlider } from "@/components/site/hero-slider";
import { StatsBand } from "@/components/site/stats-band";
import { SectionHeading } from "@/components/site/section-heading";
import { PostCard } from "@/components/site/post-card";
import { AppPromoCard } from "@/components/site/site-qr";
import { HomeMap } from "@/components/site/home-map";
import { getLocale, serverT, localizePosts, localizeStrings } from "@/lib/server-i18n";
import { pickLocalizedAuto } from "@/lib/translate";
import { formatDate, toFa } from "@/lib/jalali";
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
  CalendarClock,
  Clapperboard,
  HelpCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const T = serverT(locale);

  const [slidesRaw, newsRaw, announcementsRaw, programsRaw, systems, galleryRaw, president, settings, upcomingEventsRaw, videoCount] =
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
      db.event.findMany({
        where: { isActive: true, date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 3,
      }),
      db.video.count({ where: { isActive: true } }),
    ]);

  /* -------------------- ترجمهٔ آنلاین محتوای دیتابیس -------------------- */
  const [news, announcements, events] = await Promise.all([
    localizePosts(newsRaw, locale),
    localizePosts(announcementsRaw, locale),
    localizePosts(
      upcomingEventsRaw.map((e) => ({ ...e, excerpt: e.description || "" })),
      locale
    ),
  ]);

  const [slideTr, galleryTr, programTr, systemTr, eventLocTr] = await Promise.all([
    localizeStrings(slidesRaw.map((s) => `${s.title}|||${s.subtitle}`), locale),
    localizeStrings(galleryRaw.map((g) => g.title), locale),
    localizeStrings(programsRaw.map((p) => p.title), locale),
    localizeStrings(systems.map((s) => `${s.title}|||${s.description}`), locale),
    localizeStrings(events.map((e) => e.location), locale),
  ]);

  const slides = slidesRaw.map((s, i) => {
    const [title, subtitle] = (slideTr[i] || `${s.title}|||${s.subtitle}`).split("|||");
    return {
      id: s.id,
      title: title || s.title,
      subtitle: subtitle || s.subtitle,
      imageUrl: s.imageUrl,
      linkUrl: s.linkUrl,
    };
  });
  const gallery = galleryRaw.map((g, i) => ({
    ...g,
    title: galleryTr[i] || g.title,
  }));
  const programs = programsRaw.map((p, i) => ({
    ...p,
    title: programTr[i] || p.title,
  }));
  const systemsLocalized = systems.map((s, i) => {
    const [title, description] = (systemTr[i] || `${s.title}|||${s.description}`).split("|||");
    return { ...s, title: title || s.title, description: description || s.description };
  });
  const eventsLocalized = events.map((e, i) => ({
    ...e,
    location: eventLocTr[i] || e.location,
  }));

  const mediaDesc =
    videoCount > 0
      ? T("home.mediaDescV").replace("{n}", locale === "fa" ? toFa(videoCount) : String(videoCount))
      : T("home.mediaDesc");
  /* ---------------------------------------------------------------------- */

  const [featured, ...restNews] = news;
  const lat = Number(settings.mapLat) || 35.74041;
  const lng = Number(settings.mapLng) || 51.49027;

  return (
    <div className="pb-0">
      {/* اسلایدر */}
      <HeroSlider slides={slides} />

      {/* دسترسی سریع به سامانه‌ها */}
      <div className="relative z-20 -mt-14 px-4">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {systemsLocalized.map((s) => (
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
              title={T("home.latestNews")}
              subtitle={T("home.newsSubtitle")}
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
                <h3 className="text-white font-bold">{T("home.announcements")}</h3>
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
                            {formatDate(a.publishedAt, locale)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
                {announcements.length === 0 && (
                  <li className="px-5 py-6 text-sm text-muted-foreground text-center">
                    {T("home.noAnnouncement")}
                  </li>
                )}
              </ul>
              <div className="px-5 py-3 border-t border-border/60">
                <Link
                  href="/announcements"
                  className="text-xs font-bold text-primary hover:text-gold inline-flex items-center gap-1 transition-colors"
                >
                  {T("home.allAnnouncements")}
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* رویدادهای پیش رو */}
            {eventsLocalized.length > 0 && (
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-foreground">{T("home.upcomingEvents")}</h3>
                  <Link
                    href="/events"
                    className="ms-auto text-[11px] font-bold text-primary hover:text-gold inline-flex items-center gap-1"
                  >
                    {T("home.fullCalendar")}
                    <ArrowLeft className="h-3 w-3" />
                  </Link>
                </div>
                <ul className="divide-y divide-border/60">
                  {eventsLocalized.map((e) => (
                    <li key={e.id} className="px-5 py-3.5 flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-gold shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-6 text-foreground line-clamp-2">
                          {e.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(e.date, locale, { withWeekday: true })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                  {T("home.presidentRole")}
                </div>
                <Link
                  href="/p/ریاست-مرکز"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-gold transition-colors"
                >
                  {T("home.presidentMore")}
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* رشته‌های تحصیلی (خلاصه) */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">{T("home.programs")}</h3>
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
                  {T("home.programsDetails")}
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
          title={T("home.gallery")}
          subtitle={T("home.gallerySubtitle")}
          moreHref="/gallery"
          moreLabel={T("home.allImages")}
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

      {/* نقشه و مسیریابی */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <SectionHeading title={T("map.title")} subtitle={T("map.subtitle")} />
        <HomeMap lat={lat} lng={lng} address={settings.address} compact />
      </section>

      {/* دسترسی سریع به بخش‌های جدید */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/media"
            className="group bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4 hover-lift"
          >
            <span className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
              <Clapperboard className="h-5.5 w-5.5 text-white" />
            </span>
            <span>
              <span className="block font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                {T("home.media")}
              </span>
              <span className="block text-xs text-muted-foreground mt-1">
                {mediaDesc}
              </span>
            </span>
          </Link>
          <Link
            href="/faq"
            className="group bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4 hover-lift"
          >
            <span className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
              <HelpCircle className="h-5.5 w-5.5 text-white" />
            </span>
            <span>
              <span className="block font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                {T("home.faq")}
              </span>
              <span className="block text-xs text-muted-foreground mt-1">
                {T("home.faqDesc")}
              </span>
            </span>
          </Link>
          <Link
            href="/app"
            className="group bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4 hover-lift"
          >
            <span className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
              <Monitor className="h-5.5 w-5.5 text-white" />
            </span>
            <span>
              <span className="block font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                {T("home.app")}
              </span>
              <span className="block text-xs text-muted-foreground mt-1">
                {T("home.appDesc")}
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* نوار دعوت به گفتگو و تماس */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl emerald-gradient pattern-bg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs text-white mb-4">
                <MessagesSquare className="h-3.5 w-3.5 text-gold" />
                {T("home.chatBadge")}
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-white leading-relaxed">
                {T("home.chatTitle")}
              </h3>
              <p className="mt-3 text-white/70 text-sm leading-8">
                {T("home.chatBody")}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 content-center">
              <div className="rounded-2xl bg-white/8 border border-white/15 p-5 text-white">
                <Phone className="h-6 w-6 text-gold mb-3" />
                <div className="text-sm font-bold mb-1">{T("home.phonesTitle")}</div>
                <div className="text-xs text-white/70 leading-6" dir="ltr">
                  {settings.phones}
                </div>
              </div>
              <div className="rounded-2xl bg-white/8 border border-white/15 p-5 text-white">
                <MapPin className="h-6 w-6 text-gold mb-3" />
                <div className="text-sm font-bold mb-1">{T("home.addressTitle")}</div>
                <div className="text-xs text-white/70 leading-6">
                  {settings.address}
                </div>
              </div>
              <Link
                href="/contact"
                className="sm:col-span-2 rounded-2xl gold-gradient p-5 text-accent-foreground flex items-center justify-between font-bold text-sm hover:brightness-110 transition-all"
              >
                {T("home.contactForm")}
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* دعوت به نصب اپ موبایل */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <AppPromoCard />
      </section>
    </div>
  );
}
