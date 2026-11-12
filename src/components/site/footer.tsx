"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { NewsletterForm } from "./newsletter-form";
import { VisitorCounter } from "./visitor-counter";
import { LocaleSwitcher } from "./locale-switcher";
import { usePrefs } from "@/lib/prefs";
import { getPhones } from "@/lib/settings";
import { isExternal, type MenuNode } from "@/lib/menu";
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  MailOpen,
} from "lucide-react";

interface FooterProps {
  settings: Record<string, string>;
  systems: { id: string; title: string; url: string }[];
  links: { id: string; title: string; url: string }[];
  aboutMenu: MenuNode[];
}

const QUICK = [
  { href: "/news", key: "top.news", fallback: "اخبار و اطلاعیه‌ها" },
  { href: "/programs", key: "top.programs", fallback: "رشته‌های تحصیلی" },
  { href: "/documents", key: "top.documents", fallback: "فرم‌ها و آیین‌نامه‌ها" },
  { href: "/gallery", key: "top.gallery", fallback: "گالری تصاویر" },
  { href: "/membership", key: "top.memberArea", fallback: "سامانه اعضا" },
  { href: "/contact", key: "top.contact", fallback: "تماس با ما" },
];

export function Footer({ settings, systems, links, aboutMenu }: FooterProps) {
  const { t } = usePrefs();
  const phones = getPhones(settings);
  return (
    <footer className="mt-auto bg-sidebar text-sidebar-foreground pattern-bg">
      {/* پیوندهای مرتبط */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
          <span className="font-bold text-gold">{t("footer.relatedLinks")}</span>
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
              <div className="text-white/50 text-xs mt-1">{t("footer.official")}</div>
            </div>
          </div>
          <p className="text-white/60 text-sm leading-7 text-justify">
            {settings.aboutText}
          </p>
          <div className="mt-5">
            <VisitorCounter />
          </div>
        </div>

        {/* خبرنامه */}
        <div>
          <h4 className="font-bold text-gold mb-4 text-sm flex items-center gap-2">
            <MailOpen className="h-4 w-4" />
            {t("footer.newsletter")}
          </h4>
          <p className="text-white/60 text-xs leading-6 mb-4">
            {t("footer.newsletterDesc")}
          </p>
          <NewsletterForm compact />
        </div>

        {/* دسترسی سریع */}
        <div>
          <h4 className="font-bold text-gold mb-4 text-sm">{t("footer.quickAccess")}</h4>
          <ul className="space-y-2.5 text-sm">
            {QUICK.map((q) => (
              <li key={q.href}>
                <Link
                  href={q.href}
                  className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-gold" /> {t(q.key, q.fallback)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* تماس */}
        <div>
          <h4 className="font-bold text-gold mb-4 text-sm">{t("footer.contact")}</h4>
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
              <h4 className="font-bold text-gold mb-3 text-sm">{t("footer.systems")}</h4>
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
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-wrap items-center justify-center gap-3 text-xs text-white/50">
          <span>{settings.footerNote}</span>
          <LocaleSwitcher light />
        </div>
      </div>
    </footer>
  );
}
