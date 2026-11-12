import { formatJalali } from "@/lib/jalali";

/** تاریخ امروز شمسی — تبدیل ثابت به وقت تهران در سرور و کلاینت یکسان است */
export function TodayDate({ light = false }: { light?: boolean }) {
  return (
    <span suppressHydrationWarning className={light ? "text-white/80" : ""}>
      {formatJalali(new Date(), { withWeekday: true })}
    </span>
  );
}
