"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/**
 * دکمهٔ خواندن متن (TTS) — متن مقاله را با صدای مرورگر می‌خواند.
 * صدای فارسی در صورت نصب بودن انتخاب می‌شود.
 */
export function ReadAloud({ targetSelector = "#tts-content" }: { targetSelector?: string }) {
  const { t } = usePrefs();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- بررسی همگام پشتیبانی مرورگر
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    // اولویت: فارسی → عربی → انگلیسی → اولین صدا
    return (
      voices.find((v) => v.lang?.toLowerCase().startsWith("fa")) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("ar")) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
      voices[0] ||
      null
    );
  }, []);

  const start = useCallback(() => {
    const el = document.querySelector(targetSelector);
    const text = (el?.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 8000));
    const voice = pickVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = "fa-IR";
      // اگر صدایی نصب نبود، کاربر را آگاه می‌کنیم
      if (window.speechSynthesis.getVoices().length === 0) {
        setShowHint(true);
        setTimeout(() => setShowHint(false), 6000);
      }
    }
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onend = () => {
      setSpeaking(false);
      setPaused(false);
      el?.classList.remove("tts-active");
    };
    utter.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      el?.classList.remove("tts-active");
    };

    utterRef.current = utter;
    el?.classList.add("tts-active");
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    setPaused(false);
  }, [targetSelector, pickVoice]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    document.querySelector(targetSelector)?.classList.remove("tts-active");
  }, [targetSelector]);

  const togglePause = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, []);

  if (!supported) {
    return (
      <span className="text-[11px] text-muted-foreground">{t("tts.unsupported")}</span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 relative">
      <Volume2 className="h-4 w-4 text-gold shrink-0" />
      {!speaking ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={start}
          className="gap-1.5 h-8 text-xs"
          aria-label={t("tts.listen")}
        >
          <Play className="h-3.5 w-3.5" />
          {t("tts.listen")}
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={togglePause}
            className="gap-1.5 h-8 text-xs"
            aria-label={paused ? t("tts.resume") : t("tts.pause")}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? t("tts.resume") : t("tts.pause")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={stop}
            className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
            aria-label={t("tts.stop")}
          >
            <Square className="h-3 w-3" />
            {t("tts.stop")}
          </Button>
        </>
      )}
      {showHint && (
        <span className={cn("absolute top-full mt-1 right-0 whitespace-nowrap text-[10px] text-muted-foreground bg-card border border-border rounded-lg px-2 py-1 shadow-sm z-10")}>
          {t("tts.noVoice")}
        </span>
      )}
    </div>
  );
}
