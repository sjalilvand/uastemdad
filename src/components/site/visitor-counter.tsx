"use client";

import { useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs";
import { Eye, Users } from "lucide-react";

/** شمارنده بازدید سایت — نمایش در پاورقی */
export function VisitorCounter() {
  const { t, n } = usePrefs();
  const [stats, setStats] = useState<{ today: number; total: number; online: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/70">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/10 px-3 py-1.5">
        <Eye className="h-3.5 w-3.5 text-gold" />
        {t("footer.visitsToday")}: <b className="tabular-fa text-white">{stats ? n(stats.today) : "…"}</b>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/10 px-3 py-1.5">
        <Users className="h-3.5 w-3.5 text-gold" />
        {t("footer.visitsTotal")}: <b className="tabular-fa text-white">{stats ? n(stats.total) : "…"}</b>
      </span>
      {stats && stats.online > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/10 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          {t("footer.visitorsOnline")}: <b className="tabular-fa text-white">{n(stats.online)}</b>
        </span>
      )}
    </div>
  );
}
