import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { PostArchive } from "@/components/site/post-archive";
import { Search, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "نتایج جستجو" };

const PER_PAGE = 9;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where = q
    ? {
        published: true,
        OR: [
          { title: { contains: q } },
          { excerpt: { contains: q } },
          { content: { contains: q } },
        ],
      }
    : { published: true };

  const [posts, total, pages] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true },
    }),
    db.post.count({ where }),
    q
      ? db.page.findMany({
          where: {
            published: true,
            OR: [{ title: { contains: q } }, { content: { contains: q } }],
          },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title={`نتایج جستجو: ${q || "—"}`}
        subtitle={`${total.toLocaleString("fa-IR")} خبر و اطلاعیه و ${pages.length.toLocaleString("fa-IR")} صفحه یافت شد`}
        breadcrumb={[{ label: "جستجو" }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {pages.length > 0 && (
          <div className="mb-10">
            <h2 className="font-extrabold mb-4 flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-gold" />
              صفحات مرتبط
            </h2>
            <div className="flex flex-wrap gap-2">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-secondary hover:text-primary transition-colors"
                >
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {q ? (
          <PostArchive
            posts={posts}
            page={page}
            totalPages={totalPages}
            basePath="/search"
            query={q}
          />
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>عبارتی برای جستجو وارد کنید</p>
          </div>
        )}
      </div>
    </>
  );
}
