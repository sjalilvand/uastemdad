import Link from "next/link";
import { Logo } from "./logo";
import { getPhones } from "@/lib/settings";
import { isExternal, type MenuNode } from "@/lib/menu";
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";

interface FooterProps {
  settings: Record<string, string>;
  systems: { id: string; title: string; url: string }[];
  links: { id: string; title: string; url: string }[];
  aboutMenu: MenuNode[];
}

export function Footer({ settings, systems, links, aboutMenu }: FooterProps) {
  const phones = getPhones(settings);
  return (
    <footer className="mt-auto bg-sidebar text-sidebar-foreground pattern-bg">
      {/* پیوندهای مرتبط */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
          <span className="font-bold text-gold">پیوندهای مرتبط:</span>
          {links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-white/75 hover:text-white transition-colors"
            >
              {l.title}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        {/* درباره */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Logo className="h-12 w-12" />
            <div>
              <div className="font-extrabold text-white text-sm leading-6">
                {settings.siteName}
              </div>
              <div className="text-white/50 text-xs mt-1">سامانه رسمی مرکز</div>
            </div>
          </div>
          <p className="text-white/60 text-sm leading-7 text-justify">
            {settings.aboutText}
          </p>
        </div>

        {/* دسترسی سریع */}
        <div>
          <h4 className="font-bold text-gold mb-4 text-sm">دسترسی سریع</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/news" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-gold" /> اخبار و اطلاعیه‌ها
              </Link>
            </li>
            <li>
              <Link href="/programs" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-gold" /> رشته‌های تحصیلی
              </Link>
            </li>
            <li>
              <Link href="/documents" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-gold" /> فرم‌ها و آیین‌نامه‌ها
              </Link>
            </li>
            <li>
              <Link href="/gallery" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-gold" /> گالری تصاویر
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-gold" /> تماس با ما
              </Link>
            </li>
          </ul>
        </div>

        {/* درباره مرکز */}
        <div>
          <h4 className="font-bold text-gold mb-4 text-sm">درباره مرکز</h4>
          <ul className="space-y-2.5 text-sm">
            {aboutMenu.map((m) => (
              <li key={m.id}>
                {isExternal(m.url) ? (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5 text-gold" /> {m.label}
                  </a>
                ) : (
                  <Link href={m.url} className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5 text-gold" /> {m.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* تماس */}
        <div>
          <h4 className="font-bold text-gold mb-4 text-sm">اطلاعات تماس</h4>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-gold mt-0.5 shrink-0" />
              <span className="leading-7">{settings.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-gold shrink-0" />
              <span dir="ltr" className="text-left">
                {phones.join(" – ")}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-gold shrink-0" />
              <span dir="ltr">{settings.email}</span>
            </li>
          </ul>
          {systems.length > 0 && (
            <div className="mt-5">
              <h4 className="font-bold text-gold mb-3 text-sm">سامانه‌ها</h4>
              <div className="flex flex-wrap gap-2">
                {systems.slice(0, 4).map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/8 hover:bg-white/15 border border-white/10 rounded-full px-3 py-1.5 text-white/80 hover:text-white transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-white/50">
          {settings.footerNote}
        </div>
      </div>
    </footer>
  );
}
