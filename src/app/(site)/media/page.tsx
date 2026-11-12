import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { VideoGrid } from "@/components/site/video-player";
import { Clapperboard } from "lucide-react";
import { getLocale, serverT } from "@/lib/server-i18n";
import { translateBatch, isTargetLocale } from "@/lib/translate";

export const dynamic = "force-dynamic";

export const metadata = { title: "رسانه و ویدیوها" };

export default async function MediaPage() {
  const locale = await getLocale();
  const T = serverT(locale);
  const videosRaw = await db.video.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  let videos = videosRaw;
  if (isTargetLocale(locale)) {
    const map = await translateBatch(
      videosRaw.flatMap((v) => [v.title, v.description, v.category]).filter((s) => s && s.trim()),
      locale
    );
    videos = videosRaw.map((v) => ({
      ...v,
      title: map.get(v.title.trim()) || v.title,
      description: map.get(v.description.trim()) || v.description,
      category: map.get(v.category.trim()) || v.category,
    }));
  }

  return (
    <>
      <PageHeader
        title={T("media.title")}
        subtitle={T("media.subtitle")}
        breadcrumb={[{ label: T("media.title") }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {videos.length === 0 ? (
          <div className="rounded-2xl bg-secondary/50 border border-dashed border-border p-14 text-center">
            <Clapperboard className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {T("media.empty")}
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
