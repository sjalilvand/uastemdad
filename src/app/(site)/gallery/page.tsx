import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { GalleryGrid } from "@/components/site/gallery-grid";

export const dynamic = "force-dynamic";

export const metadata = { title: "گالری تصاویر" };

export default async function GalleryPage() {
  const items = await db.galleryItem.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <PageHeader
        title="گالری تصاویر"
        subtitle="گزارش تصویری رویدادها، مراسم و فضاهای آموزشی مرکز"
        breadcrumb={[{ label: "گالری تصاویر" }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <GalleryGrid
          items={items.map((g) => ({
            id: g.id,
            title: g.title,
            imageUrl: g.imageUrl,
          }))}
        />
      </div>
    </>
  );
}
