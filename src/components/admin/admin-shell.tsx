"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { RESOURCES } from "@/lib/admin-resources";
import {
  LayoutDashboard,
  Inbox,
  Settings,
  UsersRound,
  Globe,
  LogOut,
  Newspaper,
  Menu as MenuIcon,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toFa } from "@/lib/jalali";

export function AdminShell({
  children,
  userName,
  unreadCount,
}: {
  children: React.ReactNode;
  userName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const navItems = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard, badge: 0 },
    ...RESOURCES.map((r) => ({
      href: `/admin/${r.key}`,
      label: r.label,
      icon: Newspaper as React.ComponentType<{ className?: string }>,
      badge: 0,
    })),
    {
      href: "/admin/messages",
      label: "پیام‌های دریافتی",
      icon: Inbox,
      badge: unreadCount,
    },
    { href: "/admin/users", label: "کاربران", icon: UsersRound, badge: 0 },
    { href: "/admin/settings", label: "تنظیمات سامانه", icon: Settings, badge: 0 },
  ];

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <Logo className="h-10 w-10" />
        <div className="min-w-0">
          <div className="text-white font-extrabold text-sm">پنل مدیریت</div>
          <div className="text-white/50 text-[11px] mt-0.5 truncate">
            مرکز علمی–کاربردی کمیته امداد
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                  : "text-sidebar-foreground/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="rounded-full bg-gold text-accent-foreground text-[10px] font-bold px-2 py-0.5">
                  {toFa(item.badge)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-sidebar-foreground/80 hover:bg-white/8 hover:text-white transition-colors"
        >
          <Globe className="h-4 w-4" />
          مشاهده سایت
          <ExternalLink className="h-3 w-3 opacity-60 mr-auto" />
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-300/90 hover:bg-red-500/15 hover:text-red-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          خروج از حساب
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/40">
      {/* سایدبار دسکتاپ */}
      <aside className="hidden lg:block w-64 shrink-0 bg-sidebar pattern-bg sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* سایدبار موبایل */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 bg-sidebar pattern-bg h-full shadow-2xl animate-fade-up">
            {sidebar}
          </aside>
        </div>
      )}

      {/* محتوا */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border h-16 flex items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            aria-label="منو"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-10 w-10 rounded-xl border border-border flex items-center justify-center text-foreground"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm text-foreground">
              سامانه مدیریت محتوا
            </div>
            <div className="text-[11px] text-muted-foreground">
              خوش آمدید، {userName}
            </div>
          </div>
          <div className="h-9 w-9 rounded-full gold-gradient flex items-center justify-center text-white text-xs font-bold">
            {userName.slice(0, 1)}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
