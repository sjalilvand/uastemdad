"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { Loader2, LockKeyhole, User, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "خطا در ورود");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ورود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen emerald-gradient pattern-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-2xl overflow-hidden border border-border">
          <div className="emerald-gradient pattern-bg p-8 text-center">
            <div className="inline-flex h-20 w-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur items-center justify-center mb-4">
              <Logo className="h-14 w-14" />
            </div>
            <h1 className="text-white font-extrabold text-lg leading-8">
              پنل مدیریت سامانه
            </h1>
            <p className="text-white/60 text-xs mt-1.5">
              مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره)
            </p>
          </div>

          <form onSubmit={submit} className="p-8 space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                نام کاربری
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full h-12 rounded-xl border border-input bg-background pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                رمز عبور
              </label>
              <div className="relative">
                <LockKeyhole className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl border border-input bg-background pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              ورود به پنل مدیریت
            </button>

            <div className="rounded-xl bg-secondary/70 border border-dashed border-border px-4 py-3 text-center text-[11px] text-muted-foreground leading-6">
              ورود پیش‌فرض: <b dir="ltr">admin / admin123</b>
              <br />
              پس از ورود، رمز عبور را از بخش «کاربران» تغییر دهید.
            </div>

            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              بازگشت به سایت
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
