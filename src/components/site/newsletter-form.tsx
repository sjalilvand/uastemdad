"use client";

import { useState } from "react";
import { usePrefs } from "@/lib/prefs";
import { Loader2, Send, MailCheck } from "lucide-react";

/** فرم عضویت در خبرنامه — در پاورقی و صفحه اصلی */
export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const { t } = usePrefs();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok) {
        setDone(true);
        setEmail("");
        setName("");
      } else {
        setError(t("footer.subscribeError"));
      }
    } catch {
      setError(t("footer.subscribeError"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-xs font-semibold text-white/90">
        <MailCheck className="h-4 w-4 text-gold shrink-0" />
        {t("footer.subscribed")}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2" dir="ltr">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("footer.emailPlaceholder")}
          className="flex-1 min-w-0 h-10 rounded-xl border border-white/15 bg-white/10 px-3.5 text-xs text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-gold/50 transition-shadow"
        />
        {!compact && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("footer.namePlaceholder")}
            className="w-28 h-10 rounded-xl border border-white/15 bg-white/10 px-3.5 text-xs text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-gold/50 transition-shadow"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-4 rounded-xl gold-gradient text-[#201a03] text-xs font-extrabold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0 cursor-pointer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {t("footer.subscribe")}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-300 font-semibold">{error}</p>}
    </form>
  );
}
