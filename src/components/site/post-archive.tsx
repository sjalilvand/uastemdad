import Link from "next/link";
import { PostCard, type PostCardData } from "./post-card";
import { toFa } from "@/lib/jalali";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

export function PostArchive({
  posts,
  page,
  totalPages,
  basePath,
  query,
}: {
  posts: PostCardData[];
  page: number;
  totalPages: number;
  basePath: string;
  query?: string;
}) {
  const pageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages: number[] = [];
  for (
    let i = Math.max(1, page - 2);
    i <= Math.min(totalPages, page + 2);
    i++
  ) {
    pages.push(i);
  }

  return (
    <>
      {posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <SearchX className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-bold">موردی یافت نشد</p>
          <p className="text-sm mt-2">عبارت دیگری را جستجو کنید یا بعداً مراجعه نمایید</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="صفحه‌بندی"
          className="mt-10 flex items-center justify-center gap-1.5"
        >
          <Link
            href={pageUrl(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={cn(
              "inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3.5 text-sm font-bold transition-colors",
              page === 1
                ? "opacity-40 pointer-events-none"
                : "hover:bg-secondary hover:text-primary"
            )}
          >
            <ChevronRight className="h-4 w-4" />
            قبلی
          </Link>
          {pages.map((p) => (
            <Link
              key={p}
              href={pageUrl(p)}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition-colors",
                p === page
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "border-border bg-card hover:bg-secondary hover:text-primary"
              )}
            >
              {toFa(p)}
            </Link>
          ))}
          <Link
            href={pageUrl(Math.min(totalPages, page + 1))}
            aria-disabled={page === totalPages}
            className={cn(
              "inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3.5 text-sm font-bold transition-colors",
              page === totalPages
                ? "opacity-40 pointer-events-none"
                : "hover:bg-secondary hover:text-primary"
            )}
          >
            بعدی
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </nav>
      )}
    </>
  );
}
