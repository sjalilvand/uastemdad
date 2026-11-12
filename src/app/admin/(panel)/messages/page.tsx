"use client";

import { useEffect, useState } from "react";
import { formatJalali, toFa } from "@/lib/jalali";
import {
  Inbox,
  Loader2,
  MailOpen,
  Mail,
  Trash2,
  Phone,
  AtSign,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Msg | null>(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/messages");
    const data = await res.json();
    setMessages(data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/messages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setMessages(data?.items || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = async (m: Msg) => {
    setActive(m);
    if (!m.isRead) {
      await fetch(`/api/admin/messages/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setMessages((ms) =>
        ms.map((x) => (x.id === m.id ? { ...x, isRead: true } : x))
      );
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    setMessages((ms) => ms.filter((x) => x.id !== id));
    setActive(null);
  };

  const filtered = messages.filter(
    (m) =>
      !query.trim() ||
      [m.name, m.subject, m.message, m.email, m.phone]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">پیام‌های دریافتی</h1>
          <p className="text-xs text-muted-foreground mt-1">
            پیام‌های ارسالی از فرم «ارتباط با مرکز»
          </p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو…"
            className="pr-9 w-56 h-10 text-sm"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            پیامی یافت نشد
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => open(m)}
                  className={cn(
                    "w-full text-right px-5 py-4 flex items-center gap-4 hover:bg-secondary/40 transition-colors",
                    !m.isRead && "bg-secondary/30"
                  )}
                >
                  {m.isRead ? (
                    <MailOpen className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                  ) : (
                    <Mail className="h-5 w-5 text-primary shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {m.name}
                      </span>
                      {!m.isRead && (
                        <span className="rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5">
                          جدید
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {m.subject || m.message.slice(0, 80)}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
                    {formatJalali(m.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* نمایش پیام */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="text-right text-base">
                  {active.subject || "بدون موضوع"}
                </DialogTitle>
                <DialogDescription className="text-right text-xs">
                  {active.name} — {formatJalali(active.createdAt, { withTime: true })}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl bg-secondary/50 p-4 text-sm leading-8 whitespace-pre-wrap text-foreground">
                {active.message}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {active.phone && (
                  <span className="inline-flex items-center gap-1.5" dir="ltr">
                    <Phone className="h-3.5 w-3.5 text-gold" />
                    {active.phone}
                  </span>
                )}
                {active.email && (
                  <span className="inline-flex items-center gap-1.5" dir="ltr">
                    <AtSign className="h-3.5 w-3.5 text-gold" />
                    {active.email}
                  </span>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => remove(active.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 text-destructive px-4 py-2 text-xs font-bold hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف پیام
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {toFa(filtered.length)} پیام
      </p>
    </div>
  );
}
