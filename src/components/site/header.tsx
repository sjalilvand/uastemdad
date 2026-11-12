"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { TodayDate } from "./today-date";
import type { MenuNode } from "@/lib/menu";
import { isExternal } from "@/lib/menu";
import { getPhones } from "@/lib/settings";
import {
  ChevronDown,
  Menu as MenuIcon,
  Phone,
  Mail,
  MapPin,
  Search,
  LayoutDashboard,
  CalendarDays,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface HeaderProps {
  mainMenu: MenuNode[];
  quickMenu: MenuNode[];
  settings: Record<string, string>;
}

export function Header({ mainMenu, quickMenu, settings }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const phones = getPhones(settings);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  };

  const navLink = (item: MenuNode, inMobile = false) => {
    const external = isExternal(item.url);
    const cls = inMobile
      ? "block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors"
      : "inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-foreground/85 hover:text-primary rounded-lg hover:bg-secondary transition-colors";
    const content = (
      <>
        {item.label}
        {item.children.length > 0 && !inMobile && (
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        )}
      </>
    );
    if (external) {
      return (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
        >
          {content}
        </a>
      );
    }
    return (
      <Link key={item.id} href={item.url} className={cls} onClick={() => inMobile && setOpen(false)}>
        {content}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* نوار بالا */}
      <div className="bg-sidebar text-sidebar-foreground pattern-bg">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between gap-4 h-9 text-xs">
          <div className="flex items-center gap-4 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <CalendarDays className="h-3.5 w-3.5 text-gold" />
              <TodayDate light />
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 shrink-0">
              <Phone className="h-3.5 w-3.5 text-gold" />
              <span dir="ltr">{phones[0] || ""}</span>
            </span>
            <span className="hidden lg:inline-flex items-center gap-1.5 shrink-0">
              <Mail className="h-3.5 w-3.5 text-gold" />
              <span dir="ltr">{settings.email}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {quickMenu.map((m) => (
              <Link
                key={m.id}
                href={m.url}
                className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
              >
                {m.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-gold hover:bg-white/10 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              پنل مدیریت
            </Link>
          </div>
        </div>
      </div>

      {/* نوار اصلی */}
      <div className="bg-card/95 backdrop-blur border-b border-border/70 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between gap-3 h-[72px]">
          {/* لوگو و نام */}
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Logo />
            <div className="min-w-0">
              <div className="font-extrabold text-[15px] md:text-base leading-6 text-foreground truncate">
                {settings.siteShort}
              </div>
              <div className="text-[11px] md:text-xs text-muted-foreground truncate">
                {settings.siteName}
              </div>
            </div>
          </Link>

          {/* منوی دسکتاپ */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="منوی اصلی">
            {mainMenu.map((item) =>
              item.children.length > 0 ? (
                <div key={item.id} className="relative group">
                  {item.url === "#" ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-foreground/85 hover:text-primary rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                    >
                      {item.label}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-180" />
                    </button>
                  ) : (
                    navLink(item)
                  )}
                  <div className="absolute top-full left-0 pt-1 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                    <div className="min-w-52 rounded-xl border border-border bg-popover shadow-xl p-1.5">
                      {item.children.map((c) =>
                        isExternal(c.url) ? (
                          <a
                            key={c.id}
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg px-3 py-2 text-sm text-foreground/85 hover:bg-secondary hover:text-primary transition-colors"
                          >
                            {c.label}
                          </a>
                        ) : (
                          <Link
                            key={c.id}
                            href={c.url}
                            className="block rounded-lg px-3 py-2 text-sm text-foreground/85 hover:bg-secondary hover:text-primary transition-colors"
                          >
                            {c.label}
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                navLink(item)
              )
            )}
          </nav>

          {/* ابزارها */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="جستجو"
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              {searchOpen ? <X className="h-4.5 w-4.5" /> : <Search className="h-4.5 w-4.5" />}
            </button>
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="منو"
                  className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-secondary transition-colors"
                >
                  <MenuIcon className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-right">
                    <Logo className="h-8 w-8" />
                    <span className="text-sm">{settings.siteShort}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 pb-6 flex flex-col gap-0.5">
                  {mainMenu.map((item) => (
                    <div key={item.id}>
                      {navLink(item, true)}
                      {item.children.length > 0 && (
                        <div className="mr-4 border-r border-border pr-2 flex flex-col">
                          {item.children.map((c) => navLink(c, true))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="mt-4 rounded-xl bg-secondary p-3 text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gold" />
                      <span dir="ltr">{phones.join(" – ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gold" />
                      {settings.address}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* جستجو */}
        {searchOpen && (
          <div className="border-t border-border/60 bg-card animate-fade-up">
            <form
              onSubmit={submitSearch}
              className="mx-auto max-w-7xl px-4 py-3 flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو در اخبار، اطلاعیه‌ها و صفحات…"
                  className="w-full h-11 rounded-xl border border-input bg-background pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                جستجو
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
