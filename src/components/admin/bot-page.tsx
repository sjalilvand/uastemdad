"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Send,
  Newspaper,
  Megaphone,
  FileEdit,
  RefreshCw,
  PowerOff,
  Link2Off,
  Activity,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/jalali";

interface BotAdminRow {
  id: string;
  chatId: string;
  name: string;
  username: string;
  isActive: boolean;
  createdAt: string;
}

interface BotLogRow {
  id: string;
  chatId: string;
  action: string;
  detail: string;
  createdAt: string;
}

interface BotData {
  configured: boolean;
  enabled: boolean;
  running: boolean;
  startedAt: string | null;
  bot: { id?: number; username?: string; name?: string } | null;
  admins: BotAdminRow[];
  logs: BotLogRow[];
  stats: { newsCount: number; annCount: number; draftCount: number; total: number };
}

const ACTION_META: Record<string, { label: string; cls: string }> = {
  PUBLISH: { label: "انتشار خبر", cls: "bg-emerald-100 text-emerald-700" },
  DRAFT: { label: "ذخیرهٔ پیش‌نویس", cls: "bg-amber-100 text-amber-700" },
  DELETE: { label: "حذف خبر", cls: "bg-red-100 text-red-700" },
  LOGIN: { label: "ورود مدیر", cls: "bg-sky-100 text-sky-700" },
  UNLINK: { label: "قطع اتصال", cls: "bg-slate-200 text-slate-600" },
  POLLER_START: { label: "راه‌اندازی بات", cls: "bg-violet-100 text-violet-700" },
  POLLER_START_FAILED: { label: "خطای راه‌اندازی", cls: "bg-red-100 text-red-700" },
  POLL_ERROR: { label: "خطای polling", cls: "bg-orange-100 text-orange-700" },
  ERROR: { label: "خطا", cls: "bg-red-100 text-red-700" },
};

function fa(n: number) {
  return n.toLocaleString("fa-IR");
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0">
        <Icon className="h-5.5 w-5.5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-extrabold tabular-fa text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function BotPage() {
  const [data, setData] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bot", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (action: "restart" | "stop") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      setToast(json.message || "انجام شد");
      await load();
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 3000);
    }
  };

  const unlink = async (chatId: string) => {
    setBusy(true);
    try {
      await fetch(`/api/admin/bot?chatId=${encodeURIComponent(chatId)}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin ml-2" /> در حال دریافت وضعیت…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        دریافت وضعیت بات ناموفق بود؛ دوباره تلاش کنید.
      </div>
    );
  }

  const statusChip = data.running
    ? { text: "در حال اجرا", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 }
    : data.configured && data.enabled
      ? { text: "متوقف — نیازمند ری‌استارت", cls: "bg-amber-100 text-amber-700", Icon: XCircle }
      : { text: data.configured ? "غیرفعال (متغیر محیطی)" : "توکن تنظیم نشده", cls: "bg-slate-200 text-slate-600", Icon: XCircle };

  return (
    <div className="space-y-6">
      {/* سرصفحه */}
      <div>
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          بات بله — ثبت خبر از پیام‌رسان
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          مدیران می‌توانند بدون ورود به پنل، از طریق باتِ سامانه در بله، خبر و اطلاعیه را همراه با عکس منتشر کنند.
        </p>
      </div>

      {toast && (
        <div className="rounded-xl bg-primary/10 text-primary text-sm font-bold px-4 py-3">{toast}</div>
      )}

      {/* وضعیت اتصال */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-14 w-14 rounded-2xl emerald-gradient flex items-center justify-center">
            <Send className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-foreground">
              {data.bot?.name || "بات سامانه"}
              {data.bot?.username && (
                <span className="text-xs font-bold text-muted-foreground mr-2">@{data.bot.username}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold ${statusChip.cls}`}>
                <statusChip.Icon className="h-3.5 w-3.5" />
                {statusChip.text}
              </span>
              {data.startedAt && (
                <span className="text-muted-foreground">
                  از {formatDate(data.startedAt, "fa", { withWeekday: true })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => act("restart")}
              disabled={busy || !data.configured}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              ری‌استارت بات
            </button>
            <button
              onClick={() => act("stop")}
              disabled={busy || !data.running}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              <PowerOff className="h-4 w-4" />
              توقف
            </button>
          </div>
        </div>

        {!data.configured && (
          <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-xs leading-6 text-muted-foreground">
            توکن بات در فایل <code className="font-bold">.env</code> سرور (متغیر <code className="font-bold">BALE_BOT_TOKEN</code>) تنظیم نشده است. پس از تنظیم، سرویس برنامه را ری‌استارت کنید یا دکمهٔ «ری‌استارت بات» را بزنید.
          </div>
        )}
      </div>

      {/* آمار */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Newspaper} label="اخبار منتشرشده از بله" value={fa(data.stats.newsCount)} />
        <StatCard icon={Megaphone} label="اطلاعیه‌های منتشرشده از بله" value={fa(data.stats.annCount)} />
        <StatCard icon={FileEdit} label="پیش‌نویس‌های بله" value={fa(data.stats.draftCount)} />
        <StatCard icon={Activity} label="مدیران متصل (فعال)" value={fa(data.admins.filter((a) => a.isActive).length)} />
      </div>

      {/* راهنمای اتصال */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-extrabold flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4 text-gold" />
          نحوهٔ استفاده
        </h3>
        <ol className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground list-decimal list-inside">
          <li>
            در بله به بات پیام بدهید:{" "}
            <a
              href="https://ble.ir/Universityemdad_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
            >
              ble.ir/Universityemdad_bot
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>دستور /start را بفرستید و نام کاربری و گذرواژهٔ پنل مدیریت را وارد کنید (فقط یک بار لازم است).</li>
          <li>از منوی بات «📰 افزودن خبر جدید» را انتخاب و مراحل (عنوان ← خلاصه ← متن ← عکس‌ها ← دسته) را طی کنید.</li>
          <li>با زدن «✅ انتشار در سایت»، خبر فوراً در صفحهٔ اخبار سایت نمایش داده می‌شود.</li>
        </ol>
      </div>

      {/* مدیران متصل */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 font-extrabold text-sm">مدیران متصل</div>
        {data.admins.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            هنوز هیچ مدیری به بات متصل نشده است. پس از اولین /start و ورود، این‌جا نمایش داده می‌شود.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/50 text-muted-foreground">
                  <th className="px-4 py-3 text-right font-bold">نام</th>
                  <th className="px-4 py-3 text-right font-bold">شناسهٔ بله</th>
                  <th className="px-4 py-3 text-right font-bold">تاریخ اتصال</th>
                  <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                  <th className="px-4 py-3 text-center font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {data.admins.map((a) => (
                  <tr key={a.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-bold">{a.name || "—"}</td>
                    <td className="px-4 py-3 tabular-fa text-muted-foreground">{a.chatId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(a.createdAt, "fa")}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-3 py-1 font-bold ${
                          a.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {a.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.isActive && (
                        <button
                          onClick={() => unlink(a.chatId)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Link2Off className="h-3.5 w-3.5" />
                          قطع اتصال
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* گزارش فعالیت */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 font-extrabold text-sm">گزارش فعالیت اخیر</div>
        {data.logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">تا کنون فعالیتی ثبت نشده است.</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.logs.map((l) => {
              const meta = ACTION_META[l.action] || { label: l.action, cls: "bg-slate-200 text-slate-600" };
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-6 py-3 text-xs">
                  <span className={`rounded-full px-3 py-1 font-bold ${meta.cls}`}>{meta.label}</span>
                  <span className="flex-1 min-w-0 truncate text-foreground">{l.detail || "—"}</span>
                  <span className="text-muted-foreground">{formatDate(l.createdAt, "fa", { withWeekday: false })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
