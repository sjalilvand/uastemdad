import { ExternalLink, Navigation } from "lucide-react";

/**
 * نمایش مرکز روی نقشه — بر پایهٔ OpenStreetMap (بدون نیاز به کلید API)
 * مختصات از تنظیمات پنل مدیریت (mapLat و mapLng) خوانده می‌شود.
 */
export function ContactMap({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title: string;
}) {
  const d = 0.008; // بزرگ‌نمایی حدوداً ۱۵
  const bbox = `${(lng - d).toFixed(5)}%2C${(lat - d * 0.7).toFixed(5)}%2C${(lng + d).toFixed(5)}%2C${(lat + d * 0.7).toFixed(5)}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
  const largeUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlng=${lng}#map=16/${lat}/${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3">
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 hover:bg-primary/90 transition-colors"
          >
            <Navigation className="h-3 w-3" />
            مسیریابی
          </a>
          <a
            href={largeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="نمایش بزرگ‌تر نقشه"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="relative aspect-[16/10] bg-secondary">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="px-5 py-2.5 border-t border-border/60 text-[10px] text-muted-foreground" dir="ltr">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
