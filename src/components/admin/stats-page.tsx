"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toFa, formatJalali } from "@/lib/jalali";
import { usePrefs } from "@/lib/prefs";
import {
  BarChart3,
  Eye,
  Users,
  Globe,
  MonitorSmartphone,
  CalendarDays,
  MousePointerClick,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Timer,
  Network,
  ServerCog,
} from "lucide-react";

interface StatsData {
  today: number;
  week: number;
  month: number;
  total: number;
  uniques: number;
  online: number;
  avgPerPage: number;
  uptimeSec: number;
  server: { platform: string; nodeVersion: string; cpus: number; totalMemGB: number };
  dailySeries: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  browsers: { name: string; count: number }[];
  oses: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  cities: { name: string; count: number }[];
  recent: {
    id: string;
    path: string;
    browser: string;
    os: string;
    device: string;
    referrer: string;
    ip: string;
    country: string;
    city: string;
    createdAt: string;
  }[];
}

const DEVICE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  desktop: { label: "دسکتاپ", icon: Monitor },
  mobile: { label: "موبایل", icon: Smartphone },
  tablet: { label: "تبلت", icon: Tablet },
};

const PIE_COLORS = ["#0b5d51", "#c9a227", "#1b7f6e", "#7fb69a", "#8a6d1f", "#2e7d32"];

/** قالب‌بندی مدت کارکرد سرور */
function formatUptime(sec: number): string {
  if (!sec || sec < 0) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d} روز و ${h} ساعت`;
  if (h > 0) return `${h} ساعت و ${m} دقیقه`;
  return `${m} دقیقه`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0">
        <Icon className="h-5.5 w-5.5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-extrabold tabular-fa text-foreground">{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export function AdminStatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { n } = usePrefs();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        آماری در دسترس نیست.
      </div>
    );
  }

  const dailyChart = data.dailySeries.map((d) => ({
    date: toFa(d.date.slice(5).replace("-", "/")),
    بازدید: d.count,
  }));

  const deviceChart = data.devices.map((d) => ({
    name: DEVICE_META[d.name]?.label || d.name,
    value: d.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          آمار بازدید و مشخصات بازدیدکنندگان
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          تحلیل ترافیک سایت: بازدید روزانه، صفحات پربازدید، مرورگرها، موقعیت جغرافیایی و دستگاه‌ها
        </p>
      </div>

      {/* کارت‌های خلاصه */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Eye} label="بازدید امروز" value={n(data.today)} />
        <StatCard icon={CalendarDays} label="۷ روز اخیر" value={n(data.week)} />
        <StatCard icon={Users} label="بازدیدکننده یکتا (کل)" value={n(data.uniques)} />
        <StatCard icon={MousePointerClick} label="کل بازدیدها" value={n(data.total)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} label="۳۰ روز اخیر" value={n(data.month)} />
        <StatCard icon={Globe} label="کاربران آنلاین (۵ دقیقه اخیر)" value={n(data.online)} />
        <StatCard
          icon={Network}
          label="میانگین بازدید هر کاربر"
          value={n(data.avgPerPage)}
          hint="تعداد صفحات به ازای هر بازدیدکننده"
        />
        <StatCard
          icon={Timer}
          label="مدت کارکرد سرور"
          value={formatUptime(data.uptimeSec)}
          hint={`${data.server?.platform || ""} — Node ${data.server?.nodeVersion || ""}`}
        />
      </div>

      {/* نمودار روند روزانه */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-extrabold text-sm mb-4">روند بازدید ۱۴ روز اخیر</h3>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyChart} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b5d51" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0b5d51" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e0d3", fontSize: 12, fontFamily: "inherit" }}
              />
              <Area
                type="monotone"
                dataKey="بازدید"
                stroke="#0b5d51"
                strokeWidth={2.5}
                fill="url(#visitGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* صفحات پربازدید */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <h3 className="font-extrabold text-sm mb-4 flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-gold" />
            صفحات پربازدید
          </h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pl-1">
            {data.topPages.length === 0 && (
              <p className="text-xs text-muted-foreground">داده‌ای نیست.</p>
            )}
            {data.topPages.map((p, i) => {
              const max = data.topPages[0]?.count || 1;
              return (
                <div key={p.path}>
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="truncate font-semibold" dir="ltr">
                      {p.path}
                    </span>
                    <span className="tabular-fa font-bold text-primary shrink-0">{n(p.count)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full emerald-gradient"
                      style={{ width: `${Math.max(6, (p.count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* موقعیت جغرافیایی بازدیدکنندگان */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-extrabold text-sm mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold" />
            کشور و شهر بازدیدکنندگان
          </h3>
          {data.countries.length === 0 && data.cities.length === 0 ? (
            <p className="text-xs text-muted-foreground leading-6">
              هنوز دادهٔ جغرافیایی ثبت نشده است. موقعیت بازدیدکنندگان جدید به‌صورت خودکار ثبت می‌شود.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-bold text-muted-foreground mb-2">کشورها</div>
                <div className="space-y-2">
                  {data.countries.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{c.name}</span>
                      <span className="tabular-fa text-muted-foreground">{n(c.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {data.cities.length > 0 && (
                <div className="pt-3 border-t border-border/60">
                  <div className="text-[11px] font-bold text-muted-foreground mb-2">شهرها</div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.cities.slice(0, 6).map((c) => (
                      <span
                        key={c.name}
                        className="rounded-full bg-secondary text-primary text-[10px] font-bold px-2.5 py-1"
                      >
                        {c.name} · {n(c.count)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-border/60 text-[10px] text-muted-foreground leading-5">
            <ServerCog className="inline h-3 w-3 ml-0.5 -mt-0.5" />
            سرور: {data.server?.cpus || "?"} هسته CPU — {data.server?.totalMemGB || "?"} گیگابایت رم
          </div>
        </div>

        {/* مرورگرها */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-extrabold text-sm mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-gold" />
            مرورگرها
          </h3>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.browsers.map((b) => ({ name: b.name, value: b.count }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {data.browsers.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e0d3", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* دستگاه‌ها */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-extrabold text-sm mb-4 flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-gold" />
            دستگاه‌ها
          </h3>
          <div className="space-y-3">
            {deviceChart.map((d) => {
              const meta = Object.values(DEVICE_META).find((m) => m.label === d.name);
              const Icon = meta?.icon || Monitor;
              const total = data.devices.reduce((s, x) => s + x.count, 0) || 1;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">{d.name}</span>
                      <span className="tabular-fa text-muted-foreground">
                        {n(d.value)} ({Math.round((d.value / total) * 100)}٪)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full gold-gradient"
                        style={{ width: `${(d.value / total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground leading-6">
            سیستم‌عامل‌ها:{" "}
            {data.oses.map((o) => `${o.name} (${n(o.count)})`).join(" — ") || "—"}
          </div>
        </div>
      </div>

      {/* آخرین بازدیدها */}
      <div className="rounded-2xl border border-border bg-card p-5 overflow-x-auto">
        <h3 className="font-extrabold text-sm mb-4">آخرین بازدیدها</h3>
        <table className="w-full text-xs min-w-[760px]">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-right font-semibold py-2.5 px-2">صفحه</th>
              <th className="text-right font-semibold py-2.5 px-2">IP</th>
              <th className="text-right font-semibold py-2.5 px-2">موقعیت</th>
              <th className="text-right font-semibold py-2.5 px-2">مرورگر</th>
              <th className="text-right font-semibold py-2.5 px-2">سیستم‌عامل</th>
              <th className="text-right font-semibold py-2.5 px-2">دستگاه</th>
              <th className="text-right font-semibold py-2.5 px-2">منبع</th>
              <th className="text-right font-semibold py-2.5 px-2">زمان</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((v) => {
              const DeviceIcon = DEVICE_META[v.device]?.icon || Monitor;
              return (
                <tr key={v.id} className="border-b border-border/40 hover:bg-muted/40">
                  <td className="py-2.5 px-2 font-semibold" dir="ltr">
                    {v.path}
                  </td>
                  <td className="py-2.5 px-2 tabular-fa" dir="ltr">
                    {v.ip || "—"}
                  </td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    {v.country || v.city
                      ? [v.city, v.country].filter(Boolean).join(" — ")
                      : "—"}
                  </td>
                  <td className="py-2.5 px-2">{v.browser}</td>
                  <td className="py-2.5 px-2">{v.os}</td>
                  <td className="py-2.5 px-2">
                    <span className="inline-flex items-center gap-1">
                      <DeviceIcon className="h-3.5 w-3.5 text-gold" />
                      {DEVICE_META[v.device]?.label || v.device}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground" dir="ltr">
                    {v.referrer || "مستقیم"}
                  </td>
                  <td className="py-2.5 px-2 tabular-fa text-muted-foreground whitespace-nowrap">
                    {formatJalali(v.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
