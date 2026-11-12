import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { VisitTracker } from "@/components/site/visit-tracker";
import { PrefsFab } from "@/components/site/prefs-panel";
import { NewsTicker } from "@/components/site/news-ticker";
import { PwaRegister } from "@/components/site/pwa-register";
import { SelectionReader } from "@/components/site/selection-reader";
import { getMenus } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { getLocale, localizeRecord, localizeStrings } from "@/lib/server-i18n";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  const [mainMenuRaw, quickMenuRaw, settings, tickerPosts] = await Promise.all([
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
  const aboutMenu = mainMenuRaw.find((m) => m.label === "درباره مرکز");
  const aboutChildren =
    aboutMenu && aboutMenu.children.length > 0
      ? aboutMenu.children.map((c) => ({ id: c.id, title: c.label, url: c.url }))
      : pages.map((p) => ({
          id: p.id,
          title: p.title,
          url: `/p/${p.slug}`,
        }));

  /* ------------------------- ترجمهٔ آنلاین محتوا ------------------------- */
  // منوها
  const menuItems = [
    ...mainMenuRaw,
    ...mainMenuRaw.flatMap((m) => m.children),
    ...quickMenuRaw,
  ].map((m) => ({ id: m.id, text: m.label }));
  const aboutItems = aboutChildren.map((c) => ({ id: c.id, text: c.title }));
  const tickerItems = tickerPosts.map((p) => ({ id: p.id, text: p.title }));
  const systemItems = systems.map((s) => ({ id: s.id, text: s.title }));
  const linkItems = links.map((l) => ({ id: l.id, text: l.title }));
  const footerSettingItems = [
    { id: "siteShort", text: settings.siteShort },
    { id: "tagline", text: settings.tagline },
    { id: "address", text: settings.address },
    { id: "footerNote", text: settings.footerNote },
  ].filter((i) => i.text);

  const [menuTr, aboutTr, tickerTr, systemTr, linkTr, footerTr] =
    await Promise.all([
      localizeRecord(menuItems, locale),
      localizeRecord(aboutItems, locale),
      localizeRecord(tickerItems, locale),
      localizeRecord(systemItems, locale),
      localizeRecord(linkItems, locale),
      localizeRecord(footerSettingItems, locale),
    ]);

  const mainMenu = mainMenuRaw.map((m) => ({
    ...m,
    label: menuTr.get(m.id) || m.label,
    children: m.children.map((c) => ({
      ...c,
      label: menuTr.get(c.id) || c.label,
    })),
  }));
  const quickMenu = quickMenuRaw.map((m) => ({
    ...m,
    label: menuTr.get(m.id) || m.label,
  }));
  const localizedAbout = aboutChildren.map((c) => ({
    ...c,
    title: aboutTr.get(c.id) || c.title,
  }));
  const localizedTicker = tickerPosts.map((p) => ({
    id: p.id,
    title: tickerTr.get(p.id) || p.title,
    slug: p.slug,
    date: p.publishedAt,
  }));
  const localizedSystems = systems.map((s) => ({
    id: s.id,
    title: systemTr.get(s.id) || s.title,
    url: s.url,
  }));
  const localizedLinks = links.map((l) => ({
    id: l.id,
    title: linkTr.get(l.id) || l.title,
    url: l.url,
  }));
  const localizedAboutMenu = localizedAbout.map((c) => ({
    id: c.id,
    label: c.title,
    url: c.url,
    order: 0,
    children: [],
  }));
  const footerSettings: Record<string, string> = {
    ...settings,
    siteShort: footerTr.get("siteShort") || settings.siteShort,
    tagline: footerTr.get("tagline") || settings.tagline,
    address: footerTr.get("address") || settings.address,
    footerNote: footerTr.get("footerNote") || settings.footerNote,
  };
  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex flex-col min-h-screen">
      <Header mainMenu={mainMenu} quickMenu={quickMenu} settings={settings} />
      {settings.tickerEnabled !== "0" && (
        <NewsTicker
          items={localizedTicker.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            date: p.date,
          }))}
        />
      )}
      <main className="flex-1">{children}</main>
      <Footer
        settings={footerSettings}
        systems={localizedSystems}
        links={localizedLinks}
        aboutMenu={localizedAboutMenu}
      />
      <ChatWidget welcome={settings.chatWelcome} />
      <PrefsFab />
      <VisitTracker />
      <PwaRegister />
      <SelectionReader />
    </div>
  );
}
