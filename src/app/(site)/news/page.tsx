import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { PostArchive } from "@/components/site/post-archive";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocale, serverT, localizePosts, localizeStrings } from "@/lib/server-i18n";

export const dynamic = "force-dynamic";

export const metadata = { title: "اخبار مرکز" };

const PER_PAGE = 9;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; cat?: string }>;
}) {
  const locale = await getLocale();
  const T = serverT(locale);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q || "").trim();
  const cat = (sp.cat || "").trim();

  const where = {
    published: true,
    type: "NEWS",
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { excerpt: { contains: q } },
            { content: { contains: q } },
          ],
        }
      : {}),
    ...(cat ? { category: { slug: cat } } : {}),
  };

  const [postsRaw, total, categoriesRaw] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true },
    }),
    db.post.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const [posts, categoryNames] = await Promise.all([
    localizePosts(postsRaw, locale),
    localizeStrings(categoriesRaw.map((c) => c.name), locale),
  ]);
  const categories = categoriesRaw.map((c, i) => ({
    ...c,
    name: categoryNames[i] || c.name,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title={T("post.newsCenter")}
        subtitle={T("home.newsSubtitle")}
        breadcrumb={[{ label: T("post.newsCenter") }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* جستجو و فیلتر */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <form action="/news" className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder={T("header.searchPlaceholder")}
              className="w-full h-12 rounded-xl border border-input bg-card pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/news"
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold border transition-colors",
                !cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-primary hover:border-primary/40"
              )}
            >
              {T("post.newsAll", "همه")}
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/news?cat=${encodeURIComponent(c.slug)}`}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold border transition-colors",
                  cat === c.slug
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-primary hover:border-primary/40"
                )}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <PostArchive
          posts={posts}
          page={page}
          totalPages={totalPages}
          basePath="/news"
          query={q}
        />
      </div>
    </>
  );
}
