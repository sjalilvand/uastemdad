"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserCircle2,
  Loader2,
  LogOut,
  Save,
  AlertCircle,
  BadgeCheck,
  Clock3,
  IdCard,
  Mail,
  Phone,
  BookOpen,
  Building2,
} from "lucide-react";

interface MemberData {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  phone: string;
  field: string;
  degree: string;
  university: string;
  status: string;
  newsletter: boolean;
  createdAt: string;
}

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(
      locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
  } catch {
    return iso?.slice(0, 10) || "";
  }
}

export function MemberDashboard() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ phone: "", field: "", degree: "", university: "", newsletter: true });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    fetch("/api/member/me")
      .then(async (r) => {
        if (!r.ok) {
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.member) {
          setMember(data.member);
          setForm({
            phone: data.member.phone || "",
            field: data.member.field || "",
            degree: data.member.degree || "",
            university: data.member.university || "",
            newsletter: !!data.member.newsletter,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/member/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(t("member.saved"));
        setPw({ currentPassword: "", newPassword: "" });
      } else {
        setError(data.error || t("common.error"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch("/api/member/logout", { method: "POST" });
    router.push("/membership");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-gold mx-auto" />
        <p className="text-sm font-semibold">{t("member.notLoggedIn")}</p>
        <Button asChild className="rounded-xl">
          <Link href="/membership">{t("member.login")}</Link>
        </Button>
      </div>
    );
  }

  const statusStyle =
    member.status === "APPROVED"
      ? "bg-primary/10 text-primary"
      : member.status === "PENDING"
        ? "bg-gold/15 text-[#8a6d1f]"
        : "bg-destructive/10 text-destructive";

  const infoRows = [
    { icon: IdCard, label: t("member.studentId"), value: member.studentId },
    { icon: Mail, label: t("member.email"), value: member.email },
    { icon: Phone, label: t("member.phone"), value: member.phone || "—" },
    { icon: BookOpen, label: t("member.field"), value: member.field || "—" },
    { icon: Building2, label: t("member.university"), value: member.university || "—" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      {/* پروفایل */}
      <div className="rounded-2xl emerald-gradient pattern-bg p-6 md:p-8 text-white flex flex-wrap items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
          <UserCircle2 className="h-9 w-9" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/60">{t("member.welcome")}</div>
          <div className="font-extrabold text-lg">
            {member.firstName} {member.lastName}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${statusStyle}`}>
              <BadgeCheck className="h-3.5 w-3.5" />
              {t(`member.status.${member.status}`)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-white/80">
              <Clock3 className="h-3.5 w-3.5" />
              {t("member.since")}: {formatDate(member.createdAt, locale)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="gap-1.5 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          {t("member.logout")}
        </Button>
      </div>

      {/* اطلاعات و ویرایش */}
      <form onSubmit={save} className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-8 space-y-5">
        <h3 className="font-extrabold text-sm flex items-center gap-2">
          <UserCircle2 className="h-4.5 w-4.5 text-primary" />
          {t("member.info")}
        </h3>

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-xs">
          {infoRows.map((row, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3.5 py-2.5">
              <row.icon className="h-4 w-4 text-gold shrink-0" />
              <span className="text-muted-foreground">{row.label}:</span>
              <span className="font-bold truncate">{row.value}</span>
            </div>
          ))}
        </div>

        {message && (
          <div className="rounded-xl bg-primary/10 text-primary px-4 py-3 text-xs font-semibold">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dPhone" className="text-sm font-semibold">
              {t("member.phone")}
            </Label>
            <Input
              id="dPhone"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dField" className="text-sm font-semibold">
              {t("member.field")}
            </Label>
            <Input
              id="dField"
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dDegree" className="text-sm font-semibold">
              {t("member.degree")}
            </Label>
            <Input
              id="dDegree"
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dUni" className="text-sm font-semibold">
              {t("member.university")}
            </Label>
            <Input
              id="dUni"
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dPwCur" className="text-sm font-semibold">
              {t("member.password")} (فعلی)
            </Label>
            <Input
              id="dPwCur"
              type="password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              placeholder="••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dPwNew" className="text-sm font-semibold">
              {t("member.changePassword")}
            </Label>
            <Input
              id="dPwNew"
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              placeholder={t("member.passwordHint")}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-input bg-background px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{t("member.newsletter")}</div>
            <div className="text-[11px] text-muted-foreground">{t("member.newsletterDesc")}</div>
          </div>
          <Switch
            checked={form.newsletter}
            onCheckedChange={(v) => setForm({ ...form, newsletter: v })}
          />
        </div>

        <Button type="submit" disabled={saving} className="gap-2 rounded-xl h-11 px-8 text-sm font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("member.save")}
        </Button>
      </form>
    </div>
  );
}
