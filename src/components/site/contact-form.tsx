"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.message.trim()) {
      setError("نام و متن پیام الزامی است");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "خطا در ارسال پیام");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ارسال پیام");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-secondary/50 p-10 text-center animate-fade-up">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
        <h3 className="font-extrabold text-lg text-foreground">
          پیام شما با موفقیت ثبت شد
        </h3>
        <p className="text-sm text-muted-foreground mt-2 leading-7">
          کارشناسان مرکز در اولین فرصت پاسخگوی شما خواهند بود.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setForm({ name: "", email: "", phone: "", subject: "", message: "" });
          }}
          className="mt-6 rounded-xl border border-primary/40 text-primary px-5 py-2.5 text-sm font-bold hover:bg-primary hover:text-white transition-colors"
        >
          ارسال پیام جدید
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-4"
    >
      <h3 className="font-extrabold text-lg text-foreground">فرم ارتباط با مرکز</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">
            نام و نام خانوادگی <span className="text-destructive">*</span>
          </label>
          <input
            value={form.name}
            onChange={set("name")}
            required
            className="w-full h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">
            شماره تماس
          </label>
          <input
            value={form.phone}
            onChange={set("phone")}
            dir="ltr"
            className="w-full h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 text-left"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">
            ایمیل
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            dir="ltr"
            className="w-full h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 text-left"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">
            موضوع
          </label>
          <input
            value={form.subject}
            onChange={set("subject")}
            className="w-full h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground block mb-1.5">
          متن پیام <span className="text-destructive">*</span>
        </label>
        <textarea
          value={form.message}
          onChange={set("message")}
          required
          rows={5}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-y"
        />
      </div>
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3 text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4 -scale-x-100" />
        )}
        ارسال پیام
      </button>
    </form>
  );
}
