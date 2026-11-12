import Link from "next/link";
import { Megaphone } from "lucide-react";
import { formatJalali } from "@/lib/jalali";

export interface TickerItem {
  id: string;
  title: string;
  slug: string;
  date: Date;
}

/**
 * زیرنویس متحرک (نوار خبری) — اسکرول خودکار آخرین اطلاعیه‌ها و اخبار
 * با توقف موقت هنگام هاور و احترام به تنظیم «کاهش حرکت»
 */
export function NewsTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  // محتوای دوبار تکرارشده برای حلقهٔ بی‌وقفه
  const loop = [...items, ...items];

  return (
    <div
      className="ticker-wrap relative bg-card border-b border-border/60 overflow-hidden"
      role="marquee"
      aria-label="نوار خبری متحرک"
    >
      <div className="mx-auto max-w-7xl flex items-stretch">
        {/* برچسب ثابت */}
        <div className="shrink-0 emerald-gradient pattern-bg px-4 py-2 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-gold shrink-0" />
          <span className="text-white text-xs font-bold whitespace-nowrap">
            اطلاعیه‌ها
          </span>
        </div>
        {/* ریل متحرک */}
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track py-2">
            {loop.map((it, idx) => (
              <Link
                key={`${it.id}-${idx}`}
                href={`/announcements/${it.slug}`}
                className="group inline-flex items-center gap-2 px-6 text-xs text-foreground/80 hover:text-primary transition-colors whitespace-nowrap"
                tabIndex={idx >= items.length ? -1 : 0}
                aria-hidden={idx >= items.length}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                <span className="font-semibold">{it.title}</span>
                <span className="text-muted-foreground" dir="rtl">
                  {formatJalali(it.date)}
                </span>
              </Link>
            ))}
          </div>
          {/* سایه‌های لبه */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent" />
        </div>
      </div>
    </div>
  );
}
