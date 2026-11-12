"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { usePrefs, type BgChoice, type FontChoice, type SizeChoice, type ThemeChoice } from "@/lib/prefs";
import { LOCALES, type Locale } from "@/lib/i18n-dictionaries";
import { cn } from "@/lib/utils";
import {
  Accessibility,
  AlignJustify,
  Check,
  Contrast,
  Globe,
  Link2,
  Moon,
  Paintbrush,
  Palette,
  RotateCcw,
  Rows3,
  Type,
  Wind,
} from "lucide-react";

const FONTS: { value: FontChoice; style: string }[] = [
  { value: "vazirmatn", style: "font-sans" },
  { value: "system", style: "" },
  { value: "tahoma", style: "" },
  { value: "serif", style: "" },
];

/** ردیف تنظیمات */
function Row({
  icon: Icon,
  label,
  desc,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <div className="min-w-0">
          <div className="text-sm font-semibold">{label}</div>
          {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function chipClass(active: boolean) {
  return cn(
    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
    active
      ? "border-primary bg-primary text-primary-foreground shadow"
      : "border-border bg-background hover:border-primary/50 hover:bg-secondary"
  );
}

const SIZES: { value: SizeChoice; label: string }[] = [
  { value: "sm", label: "A−" },
  { value: "md", label: "A" },
  { value: "lg", label: "A+" },
  { value: "xl", label: "A++" },
];

const BGS: { value: BgChoice; color: string }[] = [
  { value: "default", color: "#faf8f2" },
  { value: "cream", color: "#fdf6e7" },
  { value: "mint", color: "#eef7f1" },
  { value: "sky", color: "#edf4f9" },
  { value: "sand", color: "#f7f1e8" },
];

/** تم‌های رنگی سایت */
const THEMES: { value: ThemeChoice; from: string; to: string }[] = [
  { value: "default", from: "#0b5d51", to: "#147a68" },
  { value: "mint", from: "#0d9488", to: "#2dd4bf" },
  { value: "ocean", from: "#075985", to: "#0ea5e9" },
  { value: "sunset", from: "#c2410c", to: "#f97316" },
  { value: "royal", from: "#5b21b6", to: "#8b5cf6" },
  { value: "rose", from: "#9f1239", to: "#f43f5e" },
  {
    value: "rainbow",
    from: "#ef4444",
    to: "#8b5cf6",
  },
];

export function PrefsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { prefs, set, reset, t } = usePrefs();
  const { resolvedTheme, setTheme } = useTheme();
  // دیالوگ فقط پس از تعامل کاربر باز می‌شود؛ resolvedTheme در آن زمان حل شده است
  const darkOn = resolvedTheme === "dark";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-primary" />
            {t("prefs.title")}
          </DialogTitle>
          <DialogDescription>{t("prefs.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          {/* زبان */}
          <Row icon={Globe} label={t("prefs.language")}>
            <div className="flex gap-1.5" dir="ltr">
              {LOCALES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  className={chipClass(prefs.locale === l.value)}
                  onClick={() => set({ locale: l.value as Locale })}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Row>

          {/* فونت */}
          <Row icon={Type} label={t("prefs.font")}>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={chipClass(prefs.font === f.value)}
                  style={
                    f.value === "tahoma"
                      ? { fontFamily: "Tahoma" }
                      : f.value === "serif"
                        ? { fontFamily: "'Noto Naskh Arabic', serif" }
                        : f.value === "system"
                          ? { fontFamily: "system-ui" }
                          : undefined
                  }
                  onClick={() => set({ font: f.value })}
                >
                  {t(`prefs.font.${f.value}`)}
                </button>
              ))}
            </div>
          </Row>

          {/* اندازه متن */}
          <Row icon={AlignJustify} label={t("prefs.size")}>
            <div className="flex gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-label={t(`prefs.size.${s.value}`)}
                  title={t(`prefs.size.${s.value}`)}
                  className={cn(chipClass(prefs.size === s.value), "min-w-10")}
                  onClick={() => set({ size: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Row>

          {/* تم رنگی */}
          <Row icon={Palette} label={t("prefs.theme")}>
            <div className="flex flex-wrap gap-1.5 justify-end max-w-[60%]">
              {THEMES.map((th) => (
                <button
                  key={th.value}
                  type="button"
                  aria-label={t(`prefs.theme.${th.value}`)}
                  title={t(`prefs.theme.${th.value}`)}
                  onClick={() => set({ theme: th.value })}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all cursor-pointer relative",
                    prefs.theme === th.value
                      ? "border-foreground scale-110 shadow"
                      : "border-border hover:scale-105"
                  )}
                  style={
                    th.value === "rainbow"
                      ? {
                          background:
                            "conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ef4444)",
                        }
                      : { background: `linear-gradient(135deg, ${th.from}, ${th.to})` }
                  }
                >
                  {prefs.theme === th.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </Row>

          {/* رنگ پس‌زمینه */}
          <Row icon={Paintbrush} label={t("prefs.bg")}>
            <div className="flex gap-2">
              {BGS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  aria-label={t(`prefs.bg.${b.value}`)}
                  title={t(`prefs.bg.${b.value}`)}
                  onClick={() => set({ bg: b.value })}
                  className={cn(
                    "relative h-8 w-8 rounded-full border-2 transition-all cursor-pointer",
                    prefs.bg === b.value
                      ? "border-primary scale-110 shadow"
                      : "border-border hover:scale-105"
                  )}
                  style={{ background: b.color }}
                >
                  {prefs.bg === b.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Row>

          {/* سوییچ‌ها */}
          <Row icon={Moon} label={t("prefs.darkMode")}>
            <Switch checked={darkOn} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
          </Row>
          <Row
            icon={Contrast}
            label={t("prefs.contrast")}
            desc={t("prefs.contrastDesc")}
          >
            <Switch
              checked={prefs.contrast === "high"}
              onCheckedChange={(v) => set({ contrast: v ? "high" : "normal" })}
            />
          </Row>
          <Row icon={Link2} label={t("prefs.underline")}>
            <Switch checked={prefs.underline} onCheckedChange={(v) => set({ underline: v })} />
          </Row>
          <Row icon={Wind} label={t("prefs.reduceMotion")}>
            <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => set({ reduceMotion: v })} />
          </Row>
          <Row icon={Rows3} label={t("prefs.wideLines")}>
            <Switch checked={prefs.wideLines} onCheckedChange={(v) => set({ wideLines: v })} />
          </Row>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            {t("prefs.reset")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** دکمه شناور دسترسی‌پذیری (پایین-راست؛ گفتگوی هوشمند پایین-چپ است) */
export function PrefsFab() {
  const [open, setOpen] = useState(false);
  const { t } = usePrefs();
  return (
    <>
      <button
        type="button"
        aria-label={t("prefs.a11yFab")}
        title={t("prefs.a11yFab")}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full emerald-gradient text-white shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <Accessibility className="h-5 w-5" />
      </button>
      <PrefsPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
