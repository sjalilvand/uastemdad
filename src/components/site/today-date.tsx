"use client";

import { formatDate } from "@/lib/jalali";
import { usePrefs } from "@/lib/prefs";

/** تاریخ امروز مطابق زبان فعال — شمسی برای فارسی، میلادی برای ان/ع */
export function TodayDate({ light = false }: { light?: boolean }) {
  const { locale } = usePrefs();
  return (
    <span suppressHydrationWarning className={light ? "text-white/80" : ""}>
      {formatDate(new Date(), locale, { withWeekday: true })}
    </span>
  );
}
