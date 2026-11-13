"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { NewsletterForm } from "./newsletter-form";
import { VisitorCounter } from "./visitor-counter";
import { LocaleSwitcher } from "./locale-switcher";
import { usePrefs } from "@/lib/prefs";
import { getPhones } from "@/lib/settings";
import type { MenuNode } from "@/lib/menu";
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  MailOpen,
  Link2,
  Compass,
  LayoutGrid,
  ArrowUp,
} from "lucide-react";
import type { ReactNode } from "react";

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

/** عنوان ستون‌ها با خط تزئینی طلایی */
function ColTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-gold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 border border-gold/25">
          {icon}
        </span>
        {children}
      </h4>
      <div className="mt-2 h-0.5 w-10 gold-gradient rounded-full" />
    </div>
  );
}

export function Footer({ settings, systems, links, aboutMenu }: FooterProps) {
  const { t } = usePrefs();
  const phones = getPhones(settings);

  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className="mt-auto bg-sidebar text-sidebar-foreground pattern-bg relative">
      {/* خط تزئینی طلایی بالای پاورقی */}
      <div className="h-0.5 w-full bg-gradient-to-l from-gold via-gold/40 to-transparent" />

      {/* پیوندهای مرتبط — چیپ‌های مرتب و برجسته */}
      <div className="border-b border-white/10 bg-black/15">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full gold-gradient px-3.5 py-1.5 text-[11px] font-extrabold text-[#241c04] shadow-sm">
            <Link2 className="h-3.5 w-3.5" />
            {t("footer.relatedLinks")}
          </span>
          {links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex max-w-[240px] items-center gap-1.5 truncate rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[11px] font-medium text-white/75 transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:bg-white/[0.1] hover:text-white"
            >
              <span className="truncate">{l.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-90" />
            </a>
          ))}
        </div>
      </div>

      {/* ستون‌های اصلی پاورقی */}
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-12">
        {/* درباره */}
        <div className="lg:col-span-3">
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

        {/* دسترسی سریع */}
        <div className="lg:col-span-2">
          <ColTitle icon={<LayoutGrid className="h-3.5 w-3.5 text-gold" />}>
            {t("footer.quickAccess")}
          </ColTitle>
          <ul className="grid grid-cols-1 gap-1.5">
            {QUICK.map((q) => (
              <li key={q.href}>
                <Link
                  href={q.href}
                  className="group flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-gold/25 hover:bg-white/[0.06] hover:ps-3 hover:text-white"
                >
                  <ChevronLeft className="h-3 w-3 text-gold/70 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                  {t(q.key, q.fallback)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* درباره مرکز — صفحات منوی «درباره» */}
        {aboutMenu.length > 0 && (
          <div className="lg:col-span-2">
            <ColTitle icon={<Compass className="h-3.5 w-3.5 text-gold" />}>
              {t("footer.aboutCenter")}
            </ColTitle>
            <ul className="grid grid-cols-1 gap-1.5">
              {aboutMenu.slice(0, 8).map((m) => (
                <li key={m.id}>
                  <Link
                    href={m.url}
                    className="group flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-gold/25 hover:bg-white/[0.06] hover:ps-3 hover:text-white"
                  >
                    <ChevronLeft className="h-3 w-3 text-gold/70 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* خبرنامه */}
        <div className="lg:col-span-2">
          <ColTitle icon={<MailOpen className="h-3.5 w-3.5 text-gold" />}>
            {t("footer.newsletter")}
          </ColTitle>
          <p className="text-white/60 text-xs leading-6 mb-4">
            {t("footer.newsletterDesc")}
          </p>
          <NewsletterForm compact />
        </div>

        {/* تماس + سامانه‌ها */}
        <div className="lg:col-span-3">
          <ColTitle icon={<Phone className="h-3.5 w-3.5 text-gold" />}>
            {t("footer.contact")}
          </ColTitle>
          <ul className="space-y-3 text-xs text-white/70">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 border border-gold/25">
                <MapPin className="h-4 w-4 text-gold" />
              </span>
              <span className="leading-6 pt-1.5">{settings.address}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 border border-gold/25">
                <Phone className="h-4 w-4 text-gold" />
              </span>
              <span className="flex flex-col gap-0.5 pt-1.5">
                {phones.map((p) => (
                  <a
                    key={p}
                    href={`tel:${p.replace(/\s/g, "")}`}
                    dir="ltr"
                    className="w-fit text-white/70 hover:text-gold transition-colors"
                  >
                    {p}
                  </a>
                ))}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 border border-gold/25">
                <Mail className="h-4 w-4 text-gold" />
              </span>
              <a
                href={`mailto:${settings.email}`}
                dir="ltr"
                className="pt-1.5 hover:text-gold transition-colors"
              >
                {settings.email}
              </a>
            </li>
          </ul>
          {systems.length > 0 && (
            <div className="mt-5">
              <h4 className="font-bold text-gold mb-2.5 text-xs flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("footer.systems")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {systems.slice(0, 5).map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-white/[0.07] hover:bg-white/[0.13] border border-white/12 hover:border-gold/40 px-3 py-1.5 text-[11px] font-bold text-white/80 hover:text-white transition-all hover:-translate-y-0.5"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نوار پایانی */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span className="leading-6">{settings.footerNote}</span>
          <div className="flex items-center gap-2">
            <LocaleSwitcher light />
            <button
              type="button"
              onClick={scrollTop}
              aria-label={t("footer.backToTop", "بازگشت به بالای صفحه")}
              title={t("footer.backToTop", "بازگشت به بالای صفحه")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/75 transition-all hover:border-gold/50 hover:bg-gold/15 hover:text-gold cursor-pointer"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
