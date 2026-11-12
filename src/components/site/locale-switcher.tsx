"use client";

import { usePrefs } from "@/lib/prefs";
import { LOCALES, type Locale } from "@/lib/i18n-dictionaries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** تغییردهنده زبان سایت (فارسی / English / العربية) */
export function LocaleSwitcher({ light = false }: { light?: boolean }) {
  const { prefs, set, t } = usePrefs();
  const current = LOCALES.find((l) => l.value === prefs.locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("header.language")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition-colors cursor-pointer",
          light
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "text-foreground/80 hover:bg-secondary hover:text-primary"
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{current?.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => set({ locale: l.value as Locale })}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <span>{l.label}</span>
            {prefs.locale === l.value && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
