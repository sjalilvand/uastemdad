"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, Volume2 } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { speak, ttsSupported, type SpeakHandle } from "@/lib/speech";

/**
 * خواندن متن انتخاب‌شده — با انتخاب هر متنی در سایت، یک دکمهٔ شناور
 * کنار متن نمایش داده می‌شود و با کلیک، همان متن با صدای مرورگر خوانده می‌شود.
 */
export function SelectionReader() {
  const { t, locale } = usePrefs();
  const [state, setState] = useState<
    | { kind: "idle"; text: string; x: number; y: number }
    | { kind: "speaking"; x: number; y: number }
    | null
  >(null);
  const handleRef = useRef<SpeakHandle | null>(null);
  const supported = ttsSupported();

  const clear = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setState(null);
  }, []);

  // نمایش/به‌روزرسانی دکمه هنگام انتخاب متن
  useEffect(() => {
    if (!supported) return;

    const onSelect = () => {
      if (handleRef.current) return; // در حال خواندن؛ کاری نکن
      const sel = window.getSelection();
      const text = (sel?.toString() || "").replace(/\s+/g, " ").trim();
      if (!sel || sel.isCollapsed || text.length < 3) {
        setState((prev) => (prev?.kind === "idle" ? null : prev));
        return;
      }
      let rect: DOMRect | null = null;
      try {
        rect = sel.getRangeAt(0).getBoundingClientRect();
      } catch {
        rect = null;
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) return;
      setState({
        kind: "idle",
        text,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    };

    document.addEventListener("selectionchange", onSelect);
    document.addEventListener("mouseup", onSelect);
    document.addEventListener("touchend", onSelect, { passive: true });
    return () => {
      document.removeEventListener("selectionchange", onSelect);
      document.removeEventListener("mouseup", onSelect);
      document.removeEventListener("touchend", onSelect);
    };
  }, [supported]);

  // پنهان شدن هنگام اسکرول یا تغییر اندازه
  useEffect(() => {
    if (!state) return;
    const hide = () => setState((prev) => (prev?.kind === "idle" ? null : prev));
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, [state]);

  useEffect(() => () => handleRef.current?.stop(), []);

  const read = useCallback(
    (text: string, x: number, y: number) => {
      handleRef.current?.stop();
      const h = speak(text, {
        locale,
        rate: 0.95,
        onEnd: () => {
          handleRef.current = null;
          setState(null);
        },
        onError: () => {
          handleRef.current = null;
          setState(null);
        },
      });
      handleRef.current = h;
      setState({ kind: "speaking", x, y });
    },
    [locale]
  );

  if (!supported || !state) return null;

  const isSpeaking = state.kind === "speaking";

  return (
    <div
      role="toolbar"
      aria-label={t("tts.readSelection")}
      className="fixed z-[90] -translate-x-1/2 -translate-y-full"
      style={{ left: state.x, top: state.y - 8 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground shadow-lg border border-primary/40 px-1.5 py-1">
        <Volume2 className="h-3.5 w-3.5 mx-1 text-gold shrink-0" />
        {isSpeaking ? (
          <>
            <button
              type="button"
              onClick={() => {
                handleRef.current?.stop();
                handleRef.current = null;
                setState(null);
              }}
              className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              aria-label={t("tts.stop")}
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() =>
              state.kind === "idle" && read(state.text, state.x, state.y)
            }
            className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full text-xs font-bold hover:bg-white/15 transition-colors whitespace-nowrap"
            aria-label={t("tts.readSelection")}
          >
            <Play className="h-3 w-3" />
            {t("tts.readSelection")}
          </button>
        )}
      </div>
    </div>
  );
}
