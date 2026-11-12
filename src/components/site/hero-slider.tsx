"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlideData {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
}

export function HeroSlider({ slides }: { slides: SlideData[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const next = useCallback(
    () => setIndex((i) => (i + 1) % count),
    [count]
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + count) % count),
    [count]
  );

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, count]);

  if (count === 0) return null;

  return (
    <section className="relative h-[420px] md:h-[520px] overflow-hidden bg-sidebar" aria-label="اسلایدر">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          <img
            src={s.imageUrl}
            alt={s.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#082f29f2] via-[#0b5d51cc] to-[#0b5d5166]" />
          <div className="absolute inset-0 pattern-bg" />
          <div className="relative h-full mx-auto max-w-7xl px-4 flex items-center">
            <div className="max-w-2xl text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 backdrop-blur px-4 py-1.5 text-xs mb-5">
                <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                سامانه رسمی مرکز آموزش علمی–کاربردی کمیته امداد
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold leading-[1.6] drop-shadow-md">
                {s.title}
              </h1>
              {s.subtitle && (
                <p className="mt-4 text-sm md:text-lg text-white/85 leading-8">
                  {s.subtitle}
                </p>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={s.linkUrl || "#"}
                  className="rounded-xl gold-gradient px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg hover:brightness-110 transition-all"
                >
                  اطلاعات بیشتر
                </Link>
                <Link
                  href="/news"
                  className="rounded-xl border border-white/30 bg-white/10 backdrop-blur px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors"
                >
                  آخرین اخبار
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* کنترل‌ها */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="اسلاید قبلی"
            onClick={prev}
            className="absolute z-20 top-1/2 -translate-y-1/2 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="اسلاید بعدی"
            onClick={next}
            className="absolute z-20 top-1/2 -translate-y-1/2 left-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="absolute z-20 bottom-5 right-1/2 translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`اسلاید ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-8 bg-gold" : "w-2 bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
