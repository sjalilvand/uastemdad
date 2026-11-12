import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  image,
}: {
  title: string;
  subtitle?: string;
  breadcrumb: { label: string; href?: string }[];
  image?: string | null;
}) {
  return (
    <section className="relative overflow-hidden bg-sidebar pattern-bg">
      {image && (
        <>
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#082f29ee] via-[#0b5d51d9] to-[#0b5d51aa]" />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
        <nav
          aria-label="مسیر صفحه"
          className="flex flex-wrap items-center gap-1.5 text-xs text-white/60 mb-5"
        >
          <Link href="/" className="inline-flex items-center gap-1 hover:text-white transition-colors">
            <Home className="h-3.5 w-3.5" />
            خانه
          </Link>
          {breadcrumb.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <ChevronLeft className="h-3 w-3 opacity-50" />
              {b.href ? (
                <Link href={b.href} className="hover:text-white transition-colors">
                  {b.label}
                </Link>
              ) : (
                <span className={i === breadcrumb.length - 1 ? "text-gold" : ""}>
                  {b.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-relaxed">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-3xl text-sm md:text-base text-white/70 leading-8">
            {subtitle}
          </p>
        )}
      </div>
      <div className="relative h-1.5 gold-gradient" />
    </section>
  );
}
