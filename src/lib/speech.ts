"use client";

/**
 * موتور خواندن متن (TTS) سمت کلاینت — نسخهٔ مقاوم
 *
 * ریشه‌های «نخواندن» که با این نسخه حل می‌شوند:
 *  ۱) getVoices() در اولین اجرا معمولاً خالی است → با voiceschanged منتظر صداها می‌مانیم
 *  ۲) متن بلند در کروم بعد از ~۱۵ ثانیه قطع می‌شود → متن به قطعات کوتاه شکسته و صف می‌شود
 *  ۳) اگر صدای فارسی نصب نباشد، lang=fa-IR باعث سکوت کامل می‌شود → صدا با اولویت
 *     انتخاب و در نبود آن صدای پیش‌فرض + پیام راهنما استفاده می‌شود
 *  ۴) امکان توقف/ادامه و انتخاب صدا و سرعت به کاربر داده می‌شود
 */

export interface SpeakOptions {
  /** زبان متن: fa | en | ar */
  locale?: "fa" | "en" | "ar";
  /** voiceURI انتخابی کاربر (اختیاری) */
  voiceURI?: string | null;
  /** سرعت خواندن 0.5 تا 2 */
  rate?: number;
  /** شروع خواندن؛ hasVoice یعنی صدای هم‌خوان پیدا شده است */
  onStart?: (info: { total: number; voiceLang: string | null }) => void;
  onChunk?: (index: number, total: number) => void;
  onEnd?: () => void;
  onError?: () => void;
}

export interface SpeakHandle {
  stop(): void;
  pause(): void;
  resume(): void;
}

let voicesCache: SpeechSynthesisVoice[] | null = null;

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** انتظار برای بارگذاری فهرست صداها (در برخی مرورگرها ناهمگام است) */
export function loadVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  if (voicesCache && voicesCache.length > 0) return Promise.resolve(voicesCache);
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: SpeechSynthesisVoice[]) => {
      if (done) return;
      done = true;
      if (v && v.length > 0) voicesCache = v;
      resolve(v || []);
    };
    if (existing.length > 0) {
      // فهرست اولیه هست؛ شاید voiceschanged بعدی کاملش کند
      synth.addEventListener("voiceschanged", () => finish(synth.getVoices()), {
        once: true,
      });
      setTimeout(() => finish(existing), 300);
    } else {
      synth.addEventListener("voiceschanged", () => finish(synth.getVoices()), {
        once: true,
      });
      setTimeout(() => finish(synth.getVoices()), timeoutMs);
    }
  });
}

/**
 * انتخاب بهترین صدا برای زبان خواسته‌شده:
 * فارسی → عربی (فقط برای عربی) → انگلیسی → اولین صدا
 */
export function pickVoiceFor(
  voices: SpeechSynthesisVoice[],
  locale: "fa" | "en" | "ar" = "fa",
  preferredURI?: string | null
): SpeechSynthesisVoice | null {
  if (preferredURI) {
    const exact = voices.find((v) => v.voiceURI === preferredURI);
    if (exact) return exact;
  }
  const norm = (v: SpeechSynthesisVoice) => (v.lang || "").toLowerCase().replace("_", "-");
  const fa = voices.filter((v) => norm(v).startsWith("fa"));
  const ar = voices.filter((v) => norm(v).startsWith("ar"));
  const en = voices.filter((v) => norm(v).startsWith("en"));
  if (locale === "fa") return fa[0] || ar[0] || en[0] || voices[0] || null;
  if (locale === "ar") return ar[0] || fa[0] || en[0] || voices[0] || null;
  return en[0] || voices[0] || null;
}

/** آیا صدای بومیِ زبان داده‌شده نصب است؟ */
export function hasNativeVoice(
  voices: SpeechSynthesisVoice[],
  locale: "fa" | "en" | "ar" = "fa"
): boolean {
  const prefix = locale === "fa" ? "fa" : locale;
  return voices.some((v) => (v.lang || "").toLowerCase().startsWith(prefix));
}

/** شکستن متن به قطعات کوتاه روی مرز جمله‌ها */
export function chunkText(text: string, max = 170): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const rough = clean.split(/(?<=[.!?؟۔؛:…])\s+|(?<=[،,])\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const piece of rough) {
    if ((cur + " " + piece).trim().length <= max) {
      cur = (cur ? cur + " " : "") + piece;
    } else if (piece.length > max) {
      // جملهٔ خیلی بلند → شکستن روی فاصله
      if (cur) {
        chunks.push(cur);
        cur = "";
      }
      let rest = piece;
      while (rest.length > max) {
        let cut = rest.lastIndexOf(" ", max);
        if (cut < max * 0.4) cut = max;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      cur = rest;
    } else {
      if (cur) chunks.push(cur);
      cur = piece;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

/** خواندن متن با صف قطعات — handle برای توقف/ادامه */
export function speak(text: string, opts: SpeakOptions = {}): SpeakHandle {
  const locale = opts.locale || "fa";
  const rate = Math.min(2, Math.max(0.5, opts.rate || 0.95));
  if (!ttsSupported()) {
    opts.onError?.();
    return { stop: () => {}, pause: () => {}, resume: () => {} };
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    opts.onError?.();
    return { stop: () => {}, pause: () => {}, resume: () => {} };
  }

  let stopped = false;
  let index = 0;
  let errorReported = false;

  const startChunk = async () => {
    if (stopped) return;
    if (index >= chunks.length) {
      opts.onEnd?.();
      return;
    }
    const voices = await loadVoices();
    if (stopped) return;
    if (index === 0) {
      const voice = pickVoiceFor(voices, locale, opts.voiceURI);
      opts.onStart?.({
        total: chunks.length,
        voiceLang: voice ? voice.lang : null,
      });
    }
    const utter = new SpeechSynthesisUtterance(chunks[index]);
    const voice = pickVoiceFor(voices, locale, opts.voiceURI);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-SA" : "en-US";
    }
    utter.rate = rate;
    utter.pitch = 1;
    utter.onend = () => {
      if (stopped) return;
      index += 1;
      opts.onChunk?.(index, chunks.length);
      startChunk();
    };
    utter.onerror = () => {
      if (stopped) return;
      // گزارش خطا فقط یک‌بار — اگر صدایی پخش نشد کاربر مطلع شود
      if (!errorReported && index === 0) {
        errorReported = true;
        opts.onError?.();
      }
      // تلاش برای قطعهٔ بعدی؛ اگر خطا ادامه داشت متوقف می‌شود
      index += 1;
      if (index >= chunks.length) {
        opts.onEnd?.();
      } else {
        startChunk();
      }
    };
    // رفع باگ کروم: گاهی speak بعد از cancel سریع بعدی نادیده گرفته می‌شود
    setTimeout(() => {
      if (!stopped) synth.speak(utter);
    }, 30);
  };

  opts.onChunk?.(0, chunks.length);
  void startChunk();

  return {
    stop: () => {
      stopped = true;
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
    },
    pause: () => {
      try {
        synth.pause();
      } catch {
        /* ignore */
      }
    },
    resume: () => {
      try {
        synth.resume();
      } catch {
        /* ignore */
      }
    },
  };
}
