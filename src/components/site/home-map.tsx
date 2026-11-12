"use client";

import { useCallback, useState } from "react";
import {
  ExternalLink,
  MapPin,
  Navigation,
  Copy,
  Check,
  Search,
  Flag,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

/**
 * نقشهٔ مرکز با نشان (marker) + پنل مسیریابی:
 * مقصد ثابت است (دانشگاه علمی–کاربردی) و کاربر آدرس مبدأ را وارد می‌کند؛
 * سپس مسیر در گوگل‌مپ یا OpenStreetMap باز می‌شود.
 */
export function HomeMap({
  lat,
  lng,
  address,
  destName,
  compact = false,
}: {
  lat: number;
  lng: number;
  address: string;
  destName?: string;
  compact?: boolean;
}) {
  const { t, n } = usePrefs();
  const [origin, setOrigin] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const dest = destName || t("map.destName");

  // جستجوی آدرس مبدأ با Nominatim (از طریق API داخلی)
  const findOrigin = useCallback(async () => {
    const q = origin.trim();
    if (q.length < 3) {
      setError(t("map.enterOrigin"));
      return;
    }
    setError("");
    setSearching(true);
    setCandidates([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results: GeocodeResult[] };
      if (!data.results?.length) {
        setError(t("map.originNotFound"));
      } else if (data.results.length === 1) {
        setSelected(data.results[0]);
      } else {
        setCandidates(data.results);
        setSelected(data.results[0]);
      }
    } catch {
      setError(t("map.originNotFound"));
    } finally {
      setSearching(false);
    }
  }, [origin, t]);

  // مسیریابی گوگل — آدرس متنی مبدأ را خودش تبدیل می‌کند
  const googleUrl = useCallback(() => {
    const q = origin.trim();
    const originParam = q ? `&origin=${encodeURIComponent(q)}` : "";
    return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${lat},${lng}&destination_place_id=`;
  }, [origin, lat, lng]);

  // مسیریابی OSM — به مختصات نیاز دارد
  const osmUrl = useCallback(() => {
    if (selected) {
      return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${selected.lat}%2C${selected.lng};${lat}%2C${lng}`;
    }
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&destination=${lat}%2C${lng}`;
  }, [selected, lat, lng]);

  // باز کردن نقشه با نشان مقصد
  const pinUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlng=${lng}#map=16/${lat}/${lng}`;

  const copyCoords = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${lat}, ${lng}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [lat, lng]);

  const d = compact ? 0.006 : 0.008;
  const bbox = `${(lng - d).toFixed(5)}%2C${(lat - d * 0.7).toFixed(5)}%2C${(lng + d).toFixed(5)}%2C${(lat + d * 0.7).toFixed(5)}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="relative aspect-[16/10] bg-secondary">
        <iframe
          src={embedSrc}
          title={t("map.title")}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* نوار بالا: مقصد و دکمه‌ها */}
      <div className="px-5 py-4 border-b border-border/60 space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-9 w-9 rounded-xl emerald-gradient flex items-center justify-center shrink-0">
            <MapPin className="h-4.5 w-4.5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">{t("map.destTitle")}</div>
            <div className="text-sm font-bold text-foreground">{dest}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-6">
              {t("map.address")}: {address}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <a
                href={pinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 hover:bg-primary/90 transition-colors"
              >
                <MapPin className="h-3 w-3" />
                {t("map.openWithPin")}
              </a>
              <a
                href={googleUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border text-[11px] font-bold px-3 py-1.5 text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Google Maps
              </a>
              <button
                type="button"
                onClick={copyCoords}
                className="inline-flex items-center gap-1 rounded-lg border border-border text-[11px] font-bold px-3 py-1.5 text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? t("map.copied") : t("map.copyCoords")}
                <span dir="ltr" className="text-[10px] text-muted-foreground">
                  {n(lat.toFixed(4))}, {n(lng.toFixed(4))}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* پنل مسیریابی از مبدأ */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg gold-gradient flex items-center justify-center shrink-0">
            <Navigation className="h-3.5 w-3.5 text-white" />
          </span>
          <div className="text-sm font-bold text-foreground">{t("map.directions")}</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Flag className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void findOrigin();
              }}
              placeholder={t("map.originPlaceholder")}
              className="w-full h-10 rounded-xl border border-border bg-background ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              aria-label={t("map.originTitle")}
            />
          </div>
          <Button
            type="button"
            onClick={() => void findOrigin()}
            disabled={searching}
            className="h-10 px-4 gap-1.5 text-xs shrink-0"
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {searching ? t("map.locating") : t("map.findOrigin")}
          </Button>
        </div>

        {/* گزینه‌های یافت‌شده برای مبدأ */}
        {candidates.length > 1 && (
          <div>
            <div className="text-[11px] font-bold text-muted-foreground mb-1.5">
              {t("map.chooseOrigin")}
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {candidates.map((c, i) => (
                <button
                  key={`${c.lat}-${c.lng}-${i}`}
                  type="button"
                  onClick={() => {
                    setSelected(c);
                    setCandidates([]);
                  }}
                  className={cn(
                    "w-full text-start text-xs rounded-lg border px-3 py-2 transition-colors leading-6",
                    selected && selected.lat === c.lat && selected.lng === c.lng
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground hover:bg-secondary/60"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {selected && (
          <div className="rounded-xl bg-secondary/60 border border-border/60 px-3.5 py-2.5 text-xs leading-6 text-foreground">
            <span className="font-bold text-primary">{t("map.fromTo", "از {origin} به {dest}")
              .replace("{origin}", "«" + (selected.label.length > 60 ? selected.label.slice(0, 60) + "…" : selected.label) + "»")
              .replace("{dest}", dest)}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            href={googleUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!origin.trim() && !selected) {
                e.preventDefault();
                setError(t("map.enterOrigin"));
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold px-4 py-2.5 hover:bg-primary/90 transition-colors"
          >
            <Navigation className="h-3.5 w-3.5" />
            {t("map.routeGoogle")}
          </a>
          <a
            href={osmUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!origin.trim() && !selected) {
                e.preventDefault();
                setError(t("map.enterOrigin"));
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold px-4 py-2.5 hover:border-primary/40 hover:text-primary transition-colors"
          >
            <MapPin className="h-3.5 w-3.5" />
            {t("map.routeOsm")}
          </a>
        </div>

        <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          {t("map.osmNote")}
        </p>
      </div>

      <div className="px-5 py-2 border-t border-border/60 text-[10px] text-muted-foreground" dir="ltr">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
