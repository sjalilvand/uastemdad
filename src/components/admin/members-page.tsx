"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { toFa } from "@/lib/jalali";
import {
  Search,
  UserCheck,
  UserX,
  Clock3,
  Trash2,
  RefreshCw,
  UsersRound,
  IdCard,
  Mail,
  Phone,
} from "lucide-react";

interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  phone: string;
  field: string;
  degree: string;
  status: string;
  newsletter: boolean;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "در انتظار تأیید", className: "bg-gold/15 text-[#8a6d1f]" },
  APPROVED: { label: "تأیید شده", className: "bg-primary/10 text-primary" },
  REJECTED: { label: "رد شده", className: "bg-destructive/10 text-destructive" },
};

export function AdminMembersPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast({ title: "خطا در دریافت فهرست اعضا", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      toast({ title: "وضعیت عضو به‌روزرسانی شد" });
    } else {
      toast({ title: "خطا در به‌روزرسانی", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("این عضو حذف شود؟")) return;
    const res = await fetch(`/api/admin/members?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "عضو حذف شد" });
    } else {
      toast({ title: "خطا در حذف", variant: "destructive" });
    }
  };

  const pending = items.filter((m) => m.status === "PENDING").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            اعضای دانشجو
            {pending > 0 && (
              <Badge className="bg-gold text-[#201a03]">{toFa(pending)} در انتظار</Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            تأیید یا رد درخواست‌های عضویت دانشجویان و مدیریت حساب‌ها
          </p>
        </div>
        <div className="flex gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(q);
            }}
            className="relative"
          >
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی نام، دانشجویی یا ایمیل…"
              className="w-64 pr-9 rounded-xl h-10"
            />
          </form>
          <Button variant="outline" size="icon" onClick={() => load(q)} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          عضوی یافت نشد.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => {
            const meta = STATUS_META[m.status] || STATUS_META.PENDING;
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-border bg-card p-4 md:p-5 flex flex-wrap items-center gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                    {m.newsletter && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                        خبرنامه
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <IdCard className="h-3.5 w-3.5 text-gold" />
                      {m.studentId}
                    </span>
                    <span className="inline-flex items-center gap-1" dir="ltr">
                      <Mail className="h-3.5 w-3.5 text-gold" />
                      {m.email}
                    </span>
                    {m.phone && (
                      <span className="inline-flex items-center gap-1" dir="ltr">
                        <Phone className="h-3.5 w-3.5 text-gold" />
                        {m.phone}
                      </span>
                    )}
                    <span>{m.degree}{m.field ? ` — ${m.field}` : ""}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.status !== "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() => setStatus(m.id, "APPROVED")}
                      className="gap-1 rounded-xl h-9 text-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      تأیید
                    </Button>
                  )}
                  {m.status !== "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(m.id, "REJECTED")}
                      className="gap-1 rounded-xl h-9 text-xs"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      رد
                    </Button>
                  )}
                  {m.status !== "PENDING" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setStatus(m.id, "PENDING")}
                      className="gap-1 rounded-xl h-9 text-xs"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      در انتظار
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remove(m.id)}
                    className="gap-1 rounded-xl h-9 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
