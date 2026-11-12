import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { PostArchive } from "@/components/site/post-archive";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "اطلاعیه‌ها" };

const PER_PAGE = 9;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q || "").trim();

  const where = {
    published: true,
    type: "ANNOUNCEMENT",
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { excerpt: { contains: q } },
            { content: { contains: q } },
          ],
        }
      : {}),
  };

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true },
    }),
    db.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title="اطلاعیه‌ها"
        subtitle="اطلاعیه‌های رسمی و بخشنامه‌های آموزشی مرکز علمی–کاربردی کمیته امداد"
        breadcrumb={[{ label: "اطلاعیه‌ها" }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <form action="/announcements" className="relative max-w-xl mb-8">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="جستجو در اطلاعیه‌ها…"
            className="w-full h-12 rounded-xl border border-input bg-card pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </form>
        <PostArchive
          posts={posts}
          page={page}
          totalPages={totalPages}
          basePath="/announcements"
          query={q}
        />
      </div>
    </>
  );
}
