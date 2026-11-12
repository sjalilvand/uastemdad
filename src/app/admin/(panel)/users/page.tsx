"use client";

import { useEffect, useState } from "react";
import { formatJalali, toFa } from "@/lib/jalali";
import {
  UsersRound,
  Loader2,
  Plus,
  Trash2,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  UserRoundCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [pwTarget, setPwTarget] = useState<UserRow | null>(null);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setCurrentId(data.current || "");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addUser = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "خطا");
      setAddOpen(false);
      setForm({ name: "", username: "", password: "" });
      toast({ title: "کاربر جدید اضافه شد" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwTarget) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pwTarget.id, action: "changePassword", ...pwForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "خطا");
      setPwTarget(null);
      setPwForm({ currentPassword: "", newPassword: "" });
      toast({ title: "رمز عبور با موفقیت تغییر کرد" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserRow) => {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, action: "toggleActive" }),
    });
    await load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users?id=${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast({ title: "کاربر حذف شد" });
    } else {
      const data = await res.json();
      toast({ title: data?.error || "خطا در حذف", variant: "destructive" });
    }
    setDeleteTarget(null);
    await load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">کاربران مدیر</h1>
          <p className="text-xs text-muted-foreground mt-1">
            مدیریت حساب‌های دسترسی به پنل — توصیه می‌شود رمز پیش‌فرض را تغییر دهید
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold"
        >
          <Plus className="h-4 w-4" />
          افزودن کاربر
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {users.map((u) => (
              <li key={u.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="h-11 w-11 rounded-full emerald-gradient flex items-center justify-center text-white font-bold shrink-0">
                  {u.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{u.name}</span>
                    <span dir="ltr" className="text-xs text-muted-foreground">
                      @{u.username}
                    </span>
                    {u.id === currentId && (
                      <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5">
                        شما
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {u.role === "ADMIN" ? "مدیر" : u.role} — عضویت:{" "}
                    {formatJalali(u.createdAt)}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    u.isActive
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {u.isActive ? (
                    <>
                      <ShieldCheck className="h-3 w-3" /> فعال
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-3 w-3" /> غیرفعال
                    </>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="تغییر رمز عبور"
                    onClick={() => setPwTarget(u)}
                    className="h-9 w-9 rounded-lg border border-border inline-flex items-center justify-center text-gold hover:bg-secondary transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  {u.id !== currentId && (
                    <>
                      <button
                        type="button"
                        title={u.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                        onClick={() => toggleActive(u)}
                        className="h-9 w-9 rounded-lg border border-border inline-flex items-center justify-center text-foreground/70 hover:bg-secondary transition-colors"
                      >
                        <UserRoundCog className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="حذف"
                        onClick={() => setDeleteTarget(u)}
                        className="h-9 w-9 rounded-lg border border-border inline-flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="px-5 py-3 border-t border-border/50 text-[11px] text-muted-foreground">
          {toFa(users.length)} کاربر مدیر
        </div>
      </div>

      {/* افزودن کاربر */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              افزودن کاربر مدیر جدید
            </DialogTitle>
            <DialogDescription className="text-right text-xs">
              کاربر جدید با نقش مدیر به پنل دسترسی خواهد داشت
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                نام و نام خانوادگی
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                نام کاربری
              </label>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                dir="ltr"
                className="text-sm text-left"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                رمز عبور (حداقل ۶ کاراکتر)
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                dir="ltr"
                className="text-sm text-left"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button
              onClick={addUser}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              ایجاد کاربر
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* تغییر رمز */}
      <Dialog
        open={!!pwTarget}
        onOpenChange={(o) => {
          if (!o) {
            setPwTarget(null);
            setError("");
          }
        }}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              تغییر رمز عبور {pwTarget?.name ? `— ${pwTarget.name}` : ""}
            </DialogTitle>
            {pwTarget?.id === currentId && (
              <DialogDescription className="text-right text-xs">
                برای امنیت بیشتر، رمز فعلی خود را وارد کنید
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {pwTarget?.id === currentId && (
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                  رمز عبور فعلی
                </label>
                <Input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
                  }
                  dir="ltr"
                  className="text-sm text-left"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                رمز عبور جدید
              </label>
              <Input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                dir="ltr"
                className="text-sm text-left"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button
              onClick={changePassword}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              ثبت رمز جدید
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حذف */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف کاربر؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-sm">
              حساب «{deleteTarget?.name}» دیگر به پنل مدیریت دسترسی نخواهد داشت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-sm">انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive hover:bg-destructive/90 text-white text-sm"
            >
              حذف کاربر
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
