import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { getLocale, serverT, localizeStrings } from "@/lib/server-i18n";

export const dynamic = "force-dynamic";

export const metadata = { title: "گالری تصاویر" };

export default async function GalleryPage() {
  const locale = await getLocale();
  const T = serverT(locale);
  const items = await db.galleryItem.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  const titles = await localizeStrings(items.map((g) => g.title), locale);

  return (
    <>
      <PageHeader
        title={T("home.gallery")}
        subtitle={T("home.gallerySubtitle")}
        breadcrumb={[{ label: T("home.gallery") }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <GalleryGrid
          items={items.map((g, i) => ({
            id: g.id,
            title: titles[i] || g.title,
            imageUrl: g.imageUrl,
          }))}
        />
      </div>
    </>
  );
}
