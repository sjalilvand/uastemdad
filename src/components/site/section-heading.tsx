import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  subtitle,
  moreHref,
  moreLabel = "مشاهده همه",
  center = false,
  light = false,
}: {
  title: string;
  subtitle?: string;
  moreHref?: string;
  moreLabel?: string;
  center?: boolean;
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 mb-8",
        center && "flex-col items-center text-center"
      )}
    >
      <div className={cn(center && "flex flex-col items-center")}>
        <h2
          className={cn(
            "text-2xl md:text-3xl font-extrabold section-title-bar",
            light ? "text-white" : "text-foreground"
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              "mt-3 text-sm md:text-base",
              light ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {moreHref && !center && (
        <Link
          href={moreHref}
          className={cn(
            "group inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-4 py-2 transition-colors",
            light
              ? "text-gold hover:bg-white/10"
              : "text-primary hover:bg-secondary"
          )}
        >
          {moreLabel}
          <span className="transition-transform group-hover:-translate-x-1">
            ←
          </span>
        </Link>
      )}
    </div>
  );
}
