"use client";

import { useState } from "react";
import { X, Images } from "lucide-react";

export interface GalleryImg {
  id: string;
  title: string;
  imageUrl: string;
}

export function GalleryGrid({ items }: { items: GalleryImg[] }) {
  const [active, setActive] = useState<GalleryImg | null>(null);

  return (
    <>
      {items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Images className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-bold">تصویری ثبت نشده است</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 gap-4 [&>*]:mb-4">
          {items.map((g, i) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActive(g)}
              className="group relative w-full overflow-hidden rounded-2xl bg-secondary break-inside-avoid"
              aria-label={g.title}
            >
              <img
                src={g.imageUrl}
                alt={g.title}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 left-0 p-3 text-right text-white text-xs font-bold translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                {g.title}
              </div>
              <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-white/20 backdrop-blur text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* لایت‌باکس */}
      {active && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="بستن"
            className="absolute top-5 left-5 h-11 w-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            onClick={() => setActive(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="max-w-4xl w-full animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.imageUrl}
              alt={active.title}
              className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-4 text-center text-white font-bold text-sm">
              {active.title}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
