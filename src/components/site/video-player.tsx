"use client";

import { useState } from "react";
import { Play, X, Eye } from "lucide-react";
import { usePrefs } from "@/lib/prefs";

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  url: string;
  kind: string; // APARAT | YOUTUBE | FILE
  thumbnail: string | null;
  category: string;
  views: number;
}

/** تبدیل لینک معمولی آپارات/یوتیوب به لینک embed */
export function toEmbedUrl(url: string, kind: string): string {
  try {
    if (kind === "APARAT") {
      // https://www.aparat.com/v/XXXXX  یا  https://aparat.com/v/XXXXX
      const m = url.match(/aparat\.com\/(?:v|video\/video\/embed\/videohash)\/([a-zA-Z0-9]+)/);
      if (m) return `https://www.aparat.com/video/video/embed/videohash/${m[1]}/vt/frame`;
      return url;
    }
    if (kind === "YOUTUBE") {
      const m = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
      );
      if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
      return url;
    }
    return url;
  } catch {
    return url;
  }
}

export function VideoGrid({ videos }: { videos: VideoItem[] }) {
  const { n, t } = usePrefs();
  const [active, setActive] = useState<VideoItem | null>(null);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActive(v)}
            className="group text-right bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover-lift cursor-pointer"
            aria-label={`${t("media.play")}: ${v.title}`}
          >
            <div className="relative aspect-video bg-secondary">
              {v.thumbnail ? (
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full emerald-gradient pattern-bg flex items-center justify-center">
                  <Play className="h-12 w-12 text-white/80" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                <span className="h-12 w-12 rounded-full bg-black/55 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-5 w-5 text-white -scale-x-100" />
                </span>
              </div>
              <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 text-white text-[10px] font-bold px-2.5 py-1">
                {v.category}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-sm leading-6 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {v.title}
              </h3>
              {v.description && (
                <p className="mt-1.5 text-xs text-muted-foreground leading-6 line-clamp-2">
                  {v.description}
                </p>
              )}
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Eye className="h-3 w-3" />
                {n(v.views)} {t("media.views")}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* پخش‌کننده */}
      {active && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t("media.play")}
        >
          <div
            className="w-full max-w-4xl bg-card rounded-2xl overflow-hidden shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/60">
              <h3 className="font-bold text-sm text-foreground truncate">{active.title}</h3>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label={t("media.close")}
                className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {active.kind === "FILE" ? (
                <video
                  src={active.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full"
                />
              ) : (
                <iframe
                  src={toEmbedUrl(active.url, active.kind)}
                  title={active.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              )}
            </div>
            {active.description && (
              <p className="px-5 py-3 text-xs text-muted-foreground leading-6">
                {active.description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
