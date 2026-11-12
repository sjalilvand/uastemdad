import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { Users, UserRound } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "اساتید و همکاران" };

const GROUPS: { key: string; titleKey: string }[] = [
  { key: "board", titleKey: "هیئت امنا" },
  { key: "president", titleKey: "ریاست مرکز" },
  { key: "managers", titleKey: "مدیران گروه‌ها" },
  { key: "staff", titleKey: "همکاران مرکز" },
];

export default async function StaffPage() {
  const members = await db.teamMember.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <PageHeader
        title="اساتید و همکاران"
        subtitle="هیئت امنا، ریاست مرکز، مدیران گروه‌های آموزشی و همکاران مرکز"
        breadcrumb={[{ label: "اساتید و همکاران" }]}
      />
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-12">
        {members.length === 0 && (
          <div className="rounded-2xl bg-secondary/50 border border-dashed border-border p-14 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              اطلاعاتی ثبت نشده است؛ اعضا از پنل مدیریت قابل افزودن هستند.
            </p>
          </div>
        )}

        {GROUPS.map((g) => {
          const list = members.filter((m) => m.group === g.key);
          if (list.length === 0) return null;
          return (
            <section key={g.key}>
              <h2 className="text-lg font-extrabold section-title-bar mb-6">
                {g.titleKey}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {list.map((m) => (
                  <div
                    key={m.id}
                    className="group bg-card rounded-2xl border border-border shadow-sm p-5 text-center hover-lift"
                  >
                    <div className="h-20 w-20 mx-auto rounded-full overflow-hidden ring-4 ring-secondary bg-secondary flex items-center justify-center">
                      {m.photo ? (
                        <img
                          src={m.photo}
                          alt={m.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-9 w-9 text-primary/50" />
                      )}
                    </div>
                    <h3 className="mt-4 font-bold text-sm leading-7 text-foreground">
                      {m.name}
                    </h3>
                    <div className="text-xs text-gold font-bold mt-1">{m.role}</div>
                    {m.bio && (
                      <p className="mt-2 text-[11px] text-muted-foreground leading-5 line-clamp-3">
                        {m.bio.replace(/<[^>]*>/g, "")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
