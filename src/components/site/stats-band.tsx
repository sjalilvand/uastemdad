"use client";

import { useEffect, useRef, useState } from "react";
import { toFa } from "@/lib/jalali";

function useCountUp(target: number, start: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return value;
}

const ITEMS = [
  { key: "statStudents", label: "دانشجو در حال تحصیل", suffix: "+" },
  { key: "statFaculty", label: "عضو هیئت علمی", suffix: "+" },
  { key: "statPrograms", label: "رشته تحصیلی فعال", suffix: "" },
  { key: "statBooks", label: "جلد کتاب تألیفی", suffix: "" },
];

function StatItem({
  target,
  label,
  suffix,
  start,
  icon,
}: {
  target: number;
  label: string;
  suffix: string;
  start: boolean;
  icon: React.ReactNode;
}) {
  const value = useCountUp(target, start);
  return (
    <div className="flex flex-col items-center text-center gap-3 py-6">
      <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-gold">
        {icon}
      </div>
      <div className="text-3xl md:text-4xl font-extrabold text-white tabular-fa">
        {toFa(value)}
        {suffix}
      </div>
      <div className="text-white/70 text-sm">{label}</div>
    </div>
  );
}

export function StatsBand({
  stats,
}: {
  stats: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStart(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const icons = [
    <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
    <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
    <svg key="4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  ];

  return (
    <section
      ref={ref}
      className="emerald-gradient pattern-bg border-y border-white/10"
      aria-label="آمار مرکز"
    >
      <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-white/10">
        {ITEMS.map((it, i) => (
          <StatItem
            key={it.key}
            target={Number(stats[it.key]) || 0}
            label={it.label}
            suffix={it.suffix}
            start={start}
            icon={icons[i]}
          />
        ))}
      </div>
    </section>
  );
}
