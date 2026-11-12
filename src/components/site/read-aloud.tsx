"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2, Settings2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import {
  speak,
  ttsSupported,
  loadVoices,
  hasNativeVoice,
  type SpeakHandle,
} from "@/lib/speech";

const TTS_SETTINGS_KEY = "uast_tts_settings_v1";

interface TtsSettings {
  voiceURI: string | null;
  rate: number;
}

function loadTtsSettings(): TtsSettings {
  if (typeof window === "undefined") return { voiceURI: null, rate: 0.95 };
  try {
    const raw = localStorage.getItem(TTS_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TtsSettings>;
      return { voiceURI: parsed.voiceURI ?? null, rate: parsed.rate ?? 0.95 };
    }
  } catch {
    /* ignore */
  }
  return { voiceURI: null, rate: 0.95 };
}

/**
 * دکمهٔ خواندن متن (TTS) — متن مقاله را با صف قطعات کوتاه می‌خواند؛
 * انتخاب صدا و سرعت، پیشرفت خواندن و پیام راهنمای نصب صدای فارسی.
 */
export function ReadAloud({ targetSelector = "#tts-content" }: { targetSelector?: string }) {
  const { t, locale } = usePrefs();
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState({ index: 0, total: 0 });
  const [showHint, setShowHint] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<TtsSettings>({ voiceURI: null, rate: 0.95 });
  const [noText, setNoText] = useState(false);
  const handleRef = useRef<SpeakHandle | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- بررسی همگام پشتیبانی مرورگر
    setSupported(ttsSupported());
    setSettings(loadTtsSettings());
    void loadVoices().then((v) => setVoices(v));
    return () => {
      handleRef.current?.stop();
    };
  }, []);

  const persist = useCallback((s: TtsSettings) => {
    try {
      localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setSpeaking(false);
    setPaused(false);
    setProgress({ index: 0, total: 0 });
    document.querySelector(targetSelector)?.classList.remove("tts-active");
  }, [targetSelector]);

  const start = useCallback(() => {
    const el = document.querySelector(targetSelector);
    const text = (el?.textContent || "").trim();
    if (!text || !ttsSupported()) {
      setNoText(true);
      setTimeout(() => setNoText(false), 3000);
      return;
    }
    handleRef.current?.stop();
    document.querySelector(targetSelector)?.classList.add("tts-active");

    const h = speak(text, {
      locale,
      voiceURI: settings.voiceURI,
      rate: settings.rate,
      onStart: ({ total, voiceLang }) => {
        setSpeaking(true);
        setPaused(false);
        const native = hasNativeVoice(voices, locale) || (voiceLang || "").toLowerCase().startsWith(locale);
        setShowHint(!native);
        if (!native) setTimeout(() => setShowHint(false), 10000);
      },
      onChunk: (index, total) => setProgress({ index, total }),
      onEnd: () => {
        setSpeaking(false);
        setPaused(false);
        setProgress({ index: 0, total: 0 });
        document.querySelector(targetSelector)?.classList.remove("tts-active");
      },
      onError: () => {
        setSpeaking(false);
        setPaused(false);
        document.querySelector(targetSelector)?.classList.remove("tts-active");
      },
    });
    handleRef.current = h;
  }, [targetSelector, locale, settings, voices]);

  const togglePause = useCallback(() => {
    const h = handleRef.current;
    if (!h) return;
    const synth = window.speechSynthesis;
    if (synth.paused) {
      h.resume();
      setPaused(false);
    } else {
      h.pause();
      setPaused(true);
    }
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<TtsSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  if (!supported) {
    return (
      <span className="text-[11px] text-muted-foreground">{t("tts.unsupported")}</span>
    );
  }

  const sortedVoices = [...voices].sort((a, b) => {
    const rank = (v: SpeechSynthesisVoice) =>
      (v.lang || "").toLowerCase().startsWith("fa") ? 0 : (v.lang || "").toLowerCase().startsWith("ar") ? 1 : 2;
    return rank(a) - rank(b);
  });

  return (
    <div className="inline-flex flex-col items-start gap-1 relative">
      <div className="inline-flex items-center gap-1.5">
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
            {progress.total > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">
                {Math.min(progress.index + 1, progress.total)}/{progress.total}
              </span>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          aria-label={t("tts.settings")}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute top-full mt-2 right-0 z-20 w-72 rounded-2xl border border-border bg-card shadow-lg p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              {t("tts.voice")}
            </label>
            <select
              value={settings.voiceURI || ""}
              onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}
              className="w-full h-9 rounded-lg border border-border bg-background text-xs px-2"
              dir="ltr"
            >
              <option value="">{t("tts.defaultVoice")}</option>
              {sortedVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              {t("tts.speed")}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: 0.75, label: t("tts.slow") },
                { v: 0.95, label: t("tts.normalSpeed") },
                { v: 1.25, label: t("tts.fast") },
              ].map((r) => (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => updateSettings({ rate: r.v })}
                  className={cn(
                    "h-8 rounded-lg border text-xs font-bold transition-colors",
                    Math.abs(settings.rate - r.v) < 0.01
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {voices.length > 0 && !hasNativeVoice(voices, "fa") && (
            <p className="text-[10px] leading-5 text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              {t("tts.voiceHint")}
            </p>
          )}
        </div>
      )}

      {showHint && (
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {t("tts.voiceHint")}
        </span>
      )}
      {noText && (
        <span className="text-[10px] text-destructive">{t("tts.noText")}</span>
      )}
    </div>
  );
}
