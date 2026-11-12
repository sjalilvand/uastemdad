import Link from "next/link";
import { formatJalali } from "@/lib/jalali";
import { Badge } from "@/components/ui/badge";
import { Eye, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PostCardData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  type: string;
  views: number;
  publishedAt: Date | string;
  category?: { name: string; color: string } | null;
}

export function PostCard({
  post,
  featured = false,
}: {
  post: PostCardData;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "group bg-card rounded-2xl border border-border/70 overflow-hidden hover-lift h-full flex flex-col"
      )}
    >
      <Link
        href={`/news/${post.slug}`}
        className={cn(
          "relative block overflow-hidden bg-secondary",
          featured ? "aspect-[16/8]" : "aspect-[16/9]"
        )}
      >
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full emerald-gradient opacity-80" />
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          {post.type === "ANNOUNCEMENT" ? (
            <Badge className="bg-gold text-accent-foreground hover:bg-gold border-0 shadow">
              اطلاعیه
            </Badge>
          ) : (
            <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary border-0 shadow">
              خبر
            </Badge>
          )}
          {post.category && (
            <Badge
              className="border-0 shadow text-white"
              style={{ backgroundColor: post.category.color }}
            >
              {post.category.name}
            </Badge>
          )}
        </div>
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <h3
          className={cn(
            "font-bold leading-8 text-foreground group-hover:text-primary transition-colors",
            featured ? "text-lg md:text-xl" : "text-base"
          )}
        >
          <Link href={`/news/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="text-sm text-muted-foreground leading-7 mt-2 line-clamp-3 flex-1">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-gold" />
            {formatJalali(post.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {post.views.toLocaleString("fa-IR")}
          </span>
        </div>
      </div>
    </article>
  );
}
