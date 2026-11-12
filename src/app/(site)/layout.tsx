import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { VisitTracker } from "@/components/site/visit-tracker";
import { PrefsFab } from "@/components/site/prefs-panel";
import { NewsTicker } from "@/components/site/news-ticker";
import { PwaRegister } from "@/components/site/pwa-register";
import { getMenus } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mainMenu, quickMenu, settings, tickerPosts] = await Promise.all([
    getMenus("main"),
    getMenus("quick"),
    getSettings(),
    db.post.findMany({
      where: { published: true, type: "ANNOUNCEMENT" },
      orderBy: { publishedAt: "desc" },
      take: 8,
      select: { id: true, title: true, slug: true, publishedAt: true },
    }),
  ]);

  const [systems, links, pages] = await Promise.all([
    db.externalSystem.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    db.relatedLink.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    db.page.findMany({
      where: { published: true, showInMenu: true, menuGroup: "about" },
      orderBy: { order: "asc" },
    }),
  ]);

  // اگر منو از پنل مدیریت تنظیم نشده باشد، صفحات «درباره مرکز» به‌عنوان زیرمنو نمایش داده می‌شوند
  const aboutMenu = mainMenu.find((m) => m.label === "درباره مرکز");
  const aboutChildren =
    aboutMenu && aboutMenu.children.length > 0
      ? aboutMenu.children.map((c) => ({ id: c.id, title: c.label, url: c.url }))
      : pages.map((p) => ({
          id: p.id,
          title: p.title,
          url: `/p/${p.slug}`,
        }));

  return (
    <div className="flex flex-col min-h-screen">
      <Header mainMenu={mainMenu} quickMenu={quickMenu} settings={settings} />
      {settings.tickerEnabled !== "0" && (
        <NewsTicker
          items={tickerPosts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            date: p.publishedAt,
          }))}
        />
      )}
      <main className="flex-1">{children}</main>
      <Footer
        settings={settings}
        systems={systems.map((s) => ({ id: s.id, title: s.title, url: s.url }))}
        links={links.map((l) => ({ id: l.id, title: l.title, url: l.url }))}
        aboutMenu={aboutChildren.map((c) => ({
          id: c.id,
          label: c.title,
          url: c.url,
          order: 0,
          children: [],
        }))}
      />
      <ChatWidget welcome={settings.chatWelcome} />
      <PrefsFab />
      <VisitTracker />
      <PwaRegister />
    </div>
  );
}
