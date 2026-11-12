import { cn } from "@/lib/utils";

/** نشان اختصاصی مرکز: کتاب باز + دست یاری + طلوع در قاب سپر */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-11 w-11", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lg-emerald" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0" stopColor="#147A68" />
          <stop offset="1" stopColor="#0B5D51" />
        </linearGradient>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6C35C" />
          <stop offset="1" stopColor="#C9A227" />
        </linearGradient>
      </defs>
      {/* سپر */}
      <path
        d="M32 3L56 12v18c0 15-10.5 26.5-24 31C18.5 56.5 8 45 8 30V12L32 3z"
        fill="url(#lg-emerald)"
      />
      <path
        d="M32 6.2L53 14v16c0 13.4-9 23.6-21 27.8C20 53.6 11 43.4 11 30V14L32 6.2z"
        fill="none"
        stroke="url(#lg-gold)"
        strokeWidth="1.6"
        opacity="0.9"
      />
      {/* کتاب باز */}
      <path
        d="M15 26c5.5-2.6 11-2.6 17 .8 6-3.4 11.5-3.4 17-.8v17.5c-5.5-2.6-11-2.6-17 .8-6-3.4-11.5-3.4-17-.8V26z"
        fill="#ffffff"
        fillOpacity="0.16"
      />
      <path
        d="M32 26.8v17.5"
        stroke="#E6C35C"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M17 29c4.5-1.9 9-1.8 13 .7M17 33.5c4.5-1.9 9-1.8 13 .7M17 38c4.5-1.9 9-1.8 13 .7M47 29c-4.5-1.9-9-1.8-13 .7M47 33.5c-4.5-1.9-9-1.8-13 .7M47 38c-4.5-1.9-9-1.8-13 .7"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* دست یاری (کمان زیر کتاب) */}
      <path
        d="M22 48c3.2 2.6 6.6 3.9 10 3.9s6.8-1.3 10-3.9"
        stroke="url(#lg-gold)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* طلوع / ستاره */}
      <circle cx="32" cy="17.5" r="3.4" fill="url(#lg-gold)" />
      <path
        d="M32 10.5v2.2M32 22.3v2.2M25.5 17.5h2.2M36.3 17.5h2.2"
        stroke="url(#lg-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
