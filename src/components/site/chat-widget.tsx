"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "رشته‌های تحصیلی مرکز کدام‌اند؟",
  "آدرس و تلفن مرکز چیست؟",
  "آخرین اخبار مرکز را بگو",
  "سامانه‌های آموزشی کدام‌اند؟",
];

export function ChatWidget({ welcome }: { welcome: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState<string>(() => {
    // شناسه نشست فقط در مرورگر ساخته می‌شود (در رندر سرور خالی است)
    if (typeof window === "undefined") return "";
    let sid = localStorage.getItem("uast_chat_session");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("uast_chat_session", sid);
    }
    return sid;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/chat?session=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages?.length) {
          setMessages(data.messages as ChatMsg[]);
        } else {
          setMessages([{ role: "assistant", content: welcome }]);
        }
      })
      .catch(() => {
        setMessages([{ role: "assistant", content: welcome }]);
      });
  }, [sessionId, welcome]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  const toggleOpen = () => {
    if (!open && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcome }]);
    }
    setOpen(!open);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: content }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data?.reply ||
            "پاسخی دریافت نشد؛ لطفاً چند لحظه بعد دوباره تلاش کنید.",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "خطا در برقراری ارتباط با سرور؛ لطفاً دوباره تلاش کنید.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* دکمه شناور */}
      <button
        type="button"
        aria-label="گفتگوی آنلاین"
        onClick={toggleOpen}
        className={cn(
          "fixed bottom-5 left-5 z-[60] flex items-center justify-center rounded-full shadow-2xl transition-all duration-300",
          open
            ? "h-12 w-12 bg-destructive text-white rotate-90"
            : "h-14 w-14 emerald-gradient text-white hover:scale-110"
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gold"></span>
          </span>
        )}
      </button>

      {/* پنل چت */}
      {open && (
        <div className="fixed bottom-24 left-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-up">
          {/* سربرگ */}
          <div className="emerald-gradient pattern-bg px-4 py-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full gold-gradient flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm">
                دستیار هوشمند مرکز
              </div>
              <div className="text-white/70 text-[11px] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400 inline-block"></span>
                همیشه آنلاین — پاسخ فوری
              </div>
            </div>
          </div>

          {/* پیام‌ها */}
          <div
            ref={scrollRef}
            className="h-80 overflow-y-auto px-3 py-4 space-y-3 bg-background/60"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-start" : "justify-end"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-7 whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* پیشنهادها */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-[11px] bg-secondary hover:bg-primary hover:text-primary-foreground text-primary rounded-full px-3 py-1.5 transition-colors border border-primary/15"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ورودی */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-border/70 p-2.5 flex items-center gap-2 bg-card"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="پرسش خود را بنویسید…"
              className="flex-1 h-10 rounded-xl bg-background border border-input px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="ارسال"
              className="h-10 w-10 rounded-xl emerald-gradient text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send className="h-4 w-4 -scale-x-100" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
