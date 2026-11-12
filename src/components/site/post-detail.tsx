import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { PostCard, type PostCardData } from "./post-card";
import { formatJalali } from "@/lib/jalali";
import { SectionHeading } from "./section-heading";
import {
  CalendarDays,
  Eye,
  BadgeCheck,
  Megaphone,
  Newspaper,
} from "lucide-react";

export async function PostDetail({ slug }: { slug: string }) {
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

  const related = await db.post.findMany({
    where: { published: true, id: { not: post.id }, type: post.type },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: { category: true },
  });

  const isAnnouncement = post.type === "ANNOUNCEMENT";

  return (
    <>
      <PageHeader
        title={post.title}
        breadcrumb={[
          isAnnouncement
            ? { label: "اطلاعیه‌ها", href: "/announcements" }
            : { label: "اخبار مرکز", href: "/news" },
          { label: post.title },
        ]}
        image={post.coverImage}
      />

      <article className="mx-auto max-w-4xl px-4 py-10">
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          {post.coverImage && (
            <div className="aspect-[16/8] overflow-hidden bg-secondary">
              <img
                src={post.coverImage}
                alt={post.title}
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
                {isAnnouncement ? "اطلاعیه رسمی" : "خبر"}
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
                {formatJalali(post.publishedAt, { withWeekday: true })}
              </span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {(post.views + 1).toLocaleString("fa-IR")} بازدید
              </span>
            </div>

            {post.excerpt && (
              <p className="mt-6 rounded-2xl bg-secondary/70 border-r-4 border-gold p-4 text-sm leading-8 text-foreground/90">
                {post.excerpt}
              </p>
            )}

            <div
              className="rich-content mt-8"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </div>

        {/* اخبار مرتبط */}
        {related.length > 0 && (
          <div className="mt-14">
            <SectionHeading
              title={isAnnouncement ? "اطلاعیه‌های مرتبط" : "اخبار مرتبط"}
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
            بازگشت به فهرست
          </Link>
        </div>
      </article>
    </>
  );
}
