import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { VideoGrid } from "@/components/site/video-player";
import { Clapperboard } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "رسانه و ویدیوها" };

export default async function MediaPage() {
  const videos = await db.video.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <PageHeader
        title="رسانه و ویدیوها"
        subtitle="ویدیوهای معرفی مرکز، تیزرهای آموزشی و گزارش‌های تصویری رویدادها"
        breadcrumb={[{ label: "رسانه و ویدیوها" }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {videos.length === 0 ? (
          <div className="rounded-2xl bg-secondary/50 border border-dashed border-border p-14 text-center">
            <Clapperboard className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              هنوز ویدیویی ثبت نشده است؛ ویدیوها از پنل مدیریت قابل افزودن هستند.
            </p>
          </div>
        ) : (
          <VideoGrid
            videos={videos.map((v) => ({
              id: v.id,
              title: v.title,
              description: v.description,
              url: v.url,
              kind: v.kind,
              thumbnail: v.thumbnail,
              category: v.category,
              views: v.views,
            }))}
          />
        )}
      </div>
    </>
  );
}
