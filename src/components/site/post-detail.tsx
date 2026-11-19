import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { PostCard, type PostCardData } from "./post-card";
import { SectionHeading } from "./section-heading";
import { ReadAloud } from "./read-aloud";
import { getLocale, serverT, localizePosts } from "@/lib/server-i18n";
import { pickLocalizedAuto } from "@/lib/translate";
import { formatDate } from "@/lib/jalali";
import {
  CalendarDays,
  Eye,
  BadgeCheck,
  Megaphone,
  Newspaper,
  Images,
} from "lucide-react";

export async function PostDetail({ slug }: { slug: string }) {
  const locale = await getLocale();
  const T = serverT(locale);

  const post = await db.post.findFirst({
    where: { slug, published: true },
    include: { category: true },
  });
  if (!post) notFound();

  // افزایش بازدید
  await db.post.update({
    where: { id: post.id },
    data: { views: { increment: 1 } },
  });

  const relatedRaw = await db.post.findMany({
    where: { published: true, id: { not: post.id }, type: post.type },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: { category: true },
  });

  const isAnnouncement = post.type === "ANNOUNCEMENT";

  const rec = post as unknown as Record<string, unknown>;
  const [locTitle, locExcerpt, locContent] = await Promise.all([
    pickLocalizedAuto(rec, "title", locale),
    pickLocalizedAuto(rec, "excerpt", locale),
    pickLocalizedAuto(rec, "content", locale).then(
      (v) => v || post.content
    ),
  ]);

  const related = await localizePosts(relatedRaw, locale);

  // گالری تصاویر خبر (آرایهٔ JSON در فیلد images)
  let gallery: string[] = [];
  try {
    const parsed = JSON.parse(post.images || "[]");
    if (Array.isArray(parsed)) gallery = parsed.filter((x) => typeof x === "string" && x);
  } catch {
    gallery = [];
  }
  // حذف تصویر تکراری با شاخص
  if (post.coverImage && gallery[0] === post.coverImage) gallery = gallery.slice(1);

  return (
    <>
      <PageHeader
        title={locTitle}
        breadcrumb={[
          isAnnouncement
            ? { label: T("post.announcementsList"), href: "/announcements" }
            : { label: T("post.newsCenter"), href: "/news" },
          { label: locTitle },
        ]}
        image={post.coverImage}
      />

      <article className="mx-auto max-w-4xl px-4 py-10">
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          {post.coverImage && (
            <div className="aspect-[16/8] overflow-hidden bg-secondary">
              <img
                src={post.coverImage}
                alt={locTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-3 pb-6 border-b border-border/60">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-primary text-xs font-bold px-3.5 py-1.5">
                {isAnnouncement ? (
                  <Megaphone className="h-3.5 w-3.5" />
                ) : (
                  <Newspaper className="h-3.5 w-3.5" />
                )}
                {isAnnouncement ? T("post.officialAnnouncement") : T("post.news")}
              </span>
              {post.category && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full text-white text-xs font-bold px-3.5 py-1.5"
                  style={{ backgroundColor: post.category.color }}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {post.category.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-gold" />
                {formatDate(post.publishedAt, locale, { withWeekday: true })}
              </span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {locale === "fa"
                  ? `${(post.views + 1).toLocaleString("fa-IR")} ${T("post.views")}`
                  : `${(post.views + 1).toLocaleString(locale === "ar" ? "ar" : "en-US")} ${T("post.views")}`}
              </span>
              <span className="ms-auto">
                <ReadAloud targetSelector="#tts-content" />
              </span>
            </div>

            {locExcerpt && (
              <p className="mt-6 rounded-2xl bg-secondary/70 border-r-4 border-gold p-4 text-sm leading-8 text-foreground/90">
                {locExcerpt}
              </p>
            )}

            <div
              id="tts-content"
              className="rich-content mt-8"
              dangerouslySetInnerHTML={{ __html: locContent }}
            />

            {/* گالری تصاویر خبر (آپلودشده با بات بله یا پنل) */}
            {gallery.length > 0 && (
              <div className="mt-10">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground border-t border-border/60 pt-6">
                  <Images className="h-4 w-4 text-gold" />
                  گالری تصاویر
                  <span className="text-xs font-bold text-muted-foreground">({gallery.length.toLocaleString("fa-IR")} عکس)</span>
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {gallery.map((src, i) => (
                    <a
                      key={i}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-2xl border border-border bg-secondary aspect-[4/3]"
                      title="مشاهده در اندازهٔ کامل"
                    >
                      <img
                        src={src}
                        alt={`${locTitle} — تصویر ${i + 1}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-bold text-white tabular-fa">
                        {(i + 1).toLocaleString("fa-IR")}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* اخبار مرتبط */}
        {related.length > 0 && (
          <div className="mt-14">
            <SectionHeading
              title={isAnnouncement ? T("post.relatedAnnouncements") : T("post.relatedNews")}
              moreHref={isAnnouncement ? "/announcements" : "/news"}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <PostCard key={r.id} post={r as unknown as PostCardData} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href={isAnnouncement ? "/announcements" : "/news"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            {T("post.backToList")}
          </Link>
        </div>
      </article>
    </>
  );
}
