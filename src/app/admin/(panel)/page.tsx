import Link from "next/link";
import { db } from "@/lib/db";
import { formatJalali, toFa } from "@/lib/jalali";
import { RESOURCES } from "@/lib/admin-resources";
import {
  Newspaper,
  Megaphone,
  Inbox,
  Images,
  Eye,
  Plus,
  ArrowLeft,
  MessagesSquare,
  Files,
  GraduationCap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    newsCount,
    annCount,
    pageCount,
    unread,
    galleryCount,
    docCount,
    programCount,
    totalViews,
    recentPosts,
    recentMessages,
  ] = await Promise.all([
    db.post.count({ where: { type: "NEWS" } }),
    db.post.count({ where: { type: "ANNOUNCEMENT" } }),
    db.page.count(),
    db.contactMessage.count({ where: { isRead: false } }),
    db.galleryItem.count(),
    db.document.count(),
    db.program.count(),
    db.post.aggregate({ _sum: { views: true } }),
    db.post.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stats = [
    {
      label: "خبر منتشرشده",
      value: newsCount,
      icon: Newspaper,
      href: "/admin/posts",
      color: "from-emerald-600 to-emerald-800",
    },
    {
      label: "اطلاعیه",
      value: annCount,
      icon: Megaphone,
      href: "/admin/posts",
      color: "from-amber-500 to-amber-700",
    },
    {
      label: "پیام خوانده‌نشده",
      value: unread,
      icon: Inbox,
      href: "/admin/messages",
      color: "from-rose-500 to-rose-700",
    },
    {
      label: "بازدید کل مطالب",
      value: totalViews._sum.views || 0,
      icon: Eye,
      href: "/admin/posts",
      color: "from-teal-600 to-teal-800",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">داشبورد مدیریت</h1>
        <p className="text-xs text-muted-foreground mt-1">
          نمای کلی سامانه — {formatJalali(new Date(), { withWeekday: true })}
        </p>
      </div>

      {/* کارت‌های آمار */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group bg-card rounded-2xl border border-border shadow-sm p-5 hover-lift"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white`}
                >
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
              </div>
              <div className="mt-4 text-2xl font-extrabold tabular-fa text-foreground">
                {toFa(s.value).toLocaleString("fa-IR")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* آخرین مطالب */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-foreground">آخرین مطالب ویرایش‌شده</h2>
            <Link
              href="/admin/posts"
              className="text-xs font-bold text-primary hover:text-gold transition-colors"
            >
              مدیریت اخبار
            </Link>
          </div>
          <ul className="divide-y divide-border/50">
            {recentPosts.map((p) => (
              <li key={p.id} className="px-5 py-3.5 flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                    p.type === "NEWS"
                      ? "bg-primary/10 text-primary"
                      : "bg-gold/15 text-yellow-700 dark:text-gold"
                  }`}
                >
                  {p.type === "NEWS" ? "خبر" : "اطلاعیه"}
                </span>
                <span className="text-sm font-semibold truncate flex-1 text-foreground">
                  {p.title}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
                  {formatJalali(p.updatedAt)}
                </span>
              </li>
            ))}
            {recentPosts.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                مطلبی ثبت نشده است
              </li>
            )}
          </ul>
        </div>

        {/* آخرین پیام‌ها */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-foreground">آخرین پیام‌های دریافتی</h2>
            <Link
              href="/admin/messages"
              className="text-xs font-bold text-primary hover:text-gold transition-colors"
            >
              صندوق پیام‌ها
            </Link>
          </div>
          <ul className="divide-y divide-border/50">
            {recentMessages.map((m) => (
              <li key={m.id} className="px-5 py-3.5 flex items-center gap-3">
                <MessagesSquare
                  className={`h-4 w-4 shrink-0 ${
                    m.isRead ? "text-muted-foreground/40" : "text-primary"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate text-foreground">
                    {m.name}
                    {!m.isRead && (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {m.subject || m.message}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatJalali(m.createdAt)}
                </span>
              </li>
            ))}
            {recentMessages.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                پیامی دریافت نشده است
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* میانبرهای افزودن سریع */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <h2 className="font-extrabold text-sm text-foreground mb-4">میانبرهای سریع</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/posts", label: "ثبت خبر جدید", icon: Plus },
            { href: "/admin/gallery", label: `گالری (${toFa(galleryCount)})`, icon: Images },
            { href: "/admin/documents", label: `فرم‌ها (${toFa(docCount)})`, icon: Files },
            { href: "/admin/programs", label: `رشته‌ها (${toFa(programCount)})`, icon: GraduationCap },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-bold text-foreground hover:bg-secondary hover:text-primary transition-colors"
              >
                <Icon className="h-4.5 w-4.5 text-gold" />
                {a.label}
              </Link>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          مجموع صفحات سایت: {toFa(pageCount)} — کل بخش‌های قابل مدیریت:{" "}
          {toFa(RESOURCES.length + 4)}
        </p>
      </div>
    </div>
  );
}
