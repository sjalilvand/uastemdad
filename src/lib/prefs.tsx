"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DICTS, type Locale } from "./i18n-dictionaries";

/* ------------------------------------------------------------------ */
/* انواع تنظیمات شخصی‌سازی و دسترسی‌پذیری                              */
/* ------------------------------------------------------------------ */

export type FontChoice = "vazirmatn" | "system" | "tahoma" | "serif";
export type SizeChoice = "sm" | "md" | "lg" | "xl";
export type BgChoice = "default" | "cream" | "mint" | "sky" | "sand";
export type ContrastChoice = "normal" | "high";
export type LinesChoice = "normal" | "wide";

export interface Prefs {
  locale: Locale;
  font: FontChoice;
  size: SizeChoice;
  bg: BgChoice;
  contrast: ContrastChoice;
  underline: boolean;
  reduceMotion: boolean;
  wideLines: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  locale: "fa",
  font: "vazirmatn",
  size: "md",
  bg: "default",
  contrast: "normal",
  underline: false,
  reduceMotion: false,
  wideLines: false,
};

const STORAGE_KEY = "uast_prefs_v1";

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "en" ? "ltr" : "rtl";
}

/** اعمال تنظیمات روی تگ html (dataset + متغیرهای CSS) */
export function applyPrefs(prefs: Prefs) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.lang = prefs.locale;
  el.dir = dirFor(prefs.locale);
  el.dataset.font = prefs.font;
  el.dataset.size = prefs.size;
  el.dataset.bg = prefs.bg;
  el.dataset.contrast = prefs.contrast;
  el.dataset.links = prefs.underline ? "on" : "off";
  el.dataset.motion = prefs.reduceMotion ? "off" : "on";
  el.dataset.lines = prefs.wideLines ? "wide" : "normal";
}

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/* ------------------------------------------------------------------ */
/* اسکریپت اولیه برای جلوگیری از پرش (FOUT / flash) قبل از هیدریشن     */
/* ------------------------------------------------------------------ */

export const PREFS_BOOT_SCRIPT = `(function(){try{
var raw=localStorage.getItem("${STORAGE_KEY}");
var p=raw?JSON.parse(raw):{};
var d=document.documentElement;
d.lang=p.locale||"fa";
d.dir=(p.locale==="en")?"ltr":"rtl";
d.dataset.font=p.font||"vazirmatn";
d.dataset.size=p.size||"md";
d.dataset.bg=p.bg||"default";
d.dataset.contrast=p.contrast||"normal";
d.dataset.links=p.underline?"on":"off";
d.dataset.motion=p.reduceMotion?"off":"on";
d.dataset.lines=p.wideLines?"wide":"normal";
}catch(e){}})();`;

/* ------------------------------------------------------------------ */
/* کانتکست                                                            */
/* ------------------------------------------------------------------ */

interface PrefsContextValue {
  prefs: Prefs;
  /** به‌روزرسانی یک یا چند تنظیم */
  set: (patch: Partial<Prefs>) => void;
  /** بازگرداندن تنظیمات پیش‌فرض */
  reset: () => void;
  /** ترجمه بر اساس فرهنگ زبان فعال */
  t: (key: string, fallback?: string) => string;
  locale: Locale;
  dir: "rtl" | "ltr";
  /** تبدیل ارقام مطابق زبان فعال */
  n: (value: number | string) => string;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toLocaleDigits(value: number | string, locale: Locale): string {
  const s = String(value);
  if (locale === "fa") return s.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
  if (locale === "ar") return s.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  return s;
}

export function SitePrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  // بارگذاری اولیه در کلاینت — پس از هیدریشن تا با رندر سرور هماهنگ بماند
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- الگوی عمدی برای جلوگیری از ناهماهنگی هیدریشن
    setPrefs(loadPrefs());
  }, []);

  // اعمال و ذخیره در هر تغییر
  useEffect(() => {
    applyPrefs(prefs);
    // کوکی زبان برای رندر سمت سرور (صفحات اخبار و صفحات ثابت)
    document.cookie = `uast_locale=${prefs.locale};path=/;max-age=31536000;samesite=lax`;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const set = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dict = DICTS[prefs.locale] || DICTS.fa;
      return dict[key] ?? DICTS.fa[key] ?? fallback ?? key;
    },
    [prefs.locale]
  );

  const n = useCallback(
    (value: number | string) => toLocaleDigits(value, prefs.locale),
    [prefs.locale]
  );

  const value = useMemo(
    () => ({
      prefs,
      set,
      reset,
      t,
      locale: prefs.locale,
      dir: dirFor(prefs.locale),
      n,
    }),
    [prefs, set, reset, t, n]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    // fallback بی‌خطر اگر خارج از Provider استفاده شود
    return {
      prefs: DEFAULT_PREFS,
      set: () => {},
      reset: () => {},
      t: (key, fallback) => DICTS.fa[key] ?? fallback ?? key,
      locale: "fa",
      dir: "rtl",
      n: (v) => toLocaleDigits(v, "fa"),
    };
  }
  return ctx;
}
