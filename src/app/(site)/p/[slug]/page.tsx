import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { ReadAloud } from "@/components/site/read-aloud";
import { getLocale, serverT } from "@/lib/server-i18n";
import { pickLocalizedAuto } from "@/lib/translate";
import { formatDate } from "@/lib/jalali";
import { FileText, UserRound, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const GROUP_TITLES: Record<string, string> = {
  board: "اعضای هیئت امنا",
  president: "ریاست مرکز",
  staff: "همکاران مرکز",
  managers: "مدیران گروه‌ها",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await db.page.findFirst({
    where: { slug: decodeURIComponent(slug), published: true },
  });
  return { title: page?.title || decodeURIComponent(slug) };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const locale = await getLocale();
  const T = serverT(locale);
  const { slug } = await params;
  const page = await db.page.findFirst({
    where: { slug: decodeURIComponent(slug), published: true },
  });
  if (!page) notFound();

  await db.page.update({
    where: { id: page.id },
    data: { views: { increment: 1 } },
  });

  // برخی صفحات (هیئت امنا، ریاست، همکاران) اعضا را هم نمایش می‌دهند
  let members: {
    id: string;
    name: string;
    role: string;
    photo: string | null;
    bio: string;
  }[] = [];
  let memberGroup: string | null = null;
  if (page.slug === "هیئت-امنا") memberGroup = "board";
  if (page.slug === "ریاست-مرکز") memberGroup = "president";
  if (page.slug === "همکاران-مرکز") memberGroup = "staff";
  if (page.slug === "مدیران-گروه-ها") memberGroup = "managers";
  if (memberGroup) {
    members = await db.teamMember.findMany({
      where: { group: memberGroup, isActive: true },
      orderBy: { order: "asc" },
    });
  }

  const rec = page as unknown as Record<string, unknown>;
  const [locTitle, locExcerpt, locContent] = await Promise.all([
    pickLocalizedAuto(rec, "title", locale),
    pickLocalizedAuto(rec, "excerpt", locale),
    pickLocalizedAuto(rec, "content", locale).then((v) => v || page.content),
  ]);

  return (
    <>
      <PageHeader
        title={locTitle}
        subtitle={locExcerpt || undefined}
        breadcrumb={[
          ...(page.menuGroup === "about"
            ? [{ label: T("footer.aboutCenter") }]
            : []),
          { label: locTitle },
        ]}
        image={page.image}
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="bg-card rounded-3xl border border-border shadow-sm p-6 md:p-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 pb-4 border-b border-border/60">
            <FileText className="h-4 w-4 text-gold" />
            <span>
              {T("page.updated", "آخرین به‌روزرسانی")}: {formatDate(page.updatedAt, locale)}
            </span>
            <span className="mx-1">•</span>
            <UserRound className="h-4 w-4" />
            <span>
              {locale === "fa"
                ? `${(page.views + 1).toLocaleString("fa-IR")} ${T("post.views")}`
                : `${(page.views + 1).toLocaleString(locale === "ar" ? "ar" : "en-US")} ${T("post.views")}`}
            </span>
            <span className="ms-auto">
              <ReadAloud targetSelector="#tts-content" />
            </span>
          </div>

          <div
            id="tts-content"
            className="rich-content"
            dangerouslySetInnerHTML={{ __html: locContent }}
          />

          {/* اعضا */}
          {memberGroup && members.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-extrabold section-title-bar mb-8">
                {GROUP_TITLES[memberGroup]}
              </h2>
              {memberGroup === "president" ? (
                // نمایش ویژه ریاست
                members.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-border bg-secondary/40 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start"
                  >
                    <div className="h-40 w-40 rounded-2xl overflow-hidden ring-4 ring-gold/25 bg-card shrink-0">
                      {m.photo ? (
                        <img
                          src={m.photo}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full emerald-gradient flex items-center justify-center">
                          <UserRound className="h-16 w-16 text-white/70" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-right">
                      <h3 className="text-lg font-extrabold text-primary">
                        {m.name}
                      </h3>
                      <div className="text-xs font-bold text-gold mt-1 mb-4">
                        {m.role}
                      </div>
                      <div
                        className="rich-content text-sm"
                        dangerouslySetInnerHTML={{ __html: m.bio }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="group rounded-2xl border border-border bg-card p-5 text-center hover-lift"
                    >
                      <div className="h-20 w-20 mx-auto rounded-full overflow-hidden ring-4 ring-secondary bg-secondary flex items-center justify-center">
                        {m.photo ? (
                          <img
                            src={m.photo}
                            alt={m.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-9 w-9 text-primary/50" />
                        )}
                      </div>
                      <h3 className="mt-4 font-bold text-sm leading-7 text-foreground">
                        {m.name}
                      </h3>
                      <div className="text-xs text-gold font-bold mt-1.5">
                        {m.role}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {memberGroup && members.length === 0 && (
            <div className="mt-10 rounded-2xl bg-secondary/50 border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              اطلاعاتی برای این بخش ثبت نشده است
            </div>
          )}
        </div>
      </div>
    </>
  );
}
