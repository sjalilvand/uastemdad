import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { formatJalali } from "@/lib/jalali";
import {
  FolderOpen,
  FileText,
  Download,
  Scale,
  BookMarked,
  FlaskConical,
  MonitorCog,
  ClipboardList,
  Inbox,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "فرم‌ها و آیین‌نامه‌ها" };

const GROUPS = [
  { key: "فرم‌های حقوقی", icon: Scale, color: "#0B5D51" },
  { key: "آیین‌نامه‌های آموزشی", icon: BookMarked, color: "#1B7F6E" },
  { key: "آیین‌نامه‌های پژوهشی", icon: FlaskConical, color: "#7C5CBF" },
  { key: "آیین‌نامه‌های فناوری اطلاعات", icon: MonitorCog, color: "#C9A227" },
  { key: "فرم‌های آموزشی", icon: ClipboardList, color: "#2E6E4E" },
];

export default async function DocumentsPage() {
  const documents = await db.document.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="فرم‌ها و آیین‌نامه‌ها"
        subtitle="دسترسی به فرم‌های حقوقی، آموزشی، پژوهشی و آیین‌نامه‌های مرکز"
        breadcrumb={[{ label: "فرم‌ها و آیین‌نامه‌ها" }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
        {GROUPS.map((g) => {
          const items = documents.filter((d) => d.category === g.key);
          const Icon = g.icon;
          return (
            <section
              key={g.key}
              className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 bg-secondary/40">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: g.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-extrabold text-foreground">{g.key}</h2>
                <span className="text-xs bg-card border border-border rounded-full px-2.5 py-1 text-muted-foreground mr-auto">
                  {items.length.toLocaleString("fa-IR")} فایل
                </span>
              </div>
              {items.length === 0 ? (
                <div className="px-6 py-6 text-sm text-muted-foreground flex items-center gap-2">
                  <Inbox className="h-4 w-4 opacity-50" />
                  هنوز فایلی در این بخش ثبت نشده است
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {items.map((d) => (
                    <li key={d.id}>
                      <div className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-foreground">
                            {d.title}
                          </div>
                          {d.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {d.description}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground hidden sm:block shrink-0">
                          {formatJalali(d.createdAt)}
                        </span>
                        {d.fileUrl ? (
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold px-3.5 py-2 hover:bg-primary/90 transition-colors shrink-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                            دریافت
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-2 shrink-0">
                            به‌زودی
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <div className="rounded-2xl bg-secondary/50 border border-dashed border-border p-6 flex items-center gap-4">
          <FolderOpen className="h-8 w-8 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground leading-7">
            فرم ارتباط با مرکز نیز از طریق{" "}
            <Link href="/contact" className="text-primary font-bold underline underline-offset-4">
              صفحه تماس با ما
            </Link>{" "}
            در دسترس است. فایل‌های این بخش از پنل مدیریت قابل افزودن است.
          </p>
        </div>
      </div>
    </>
  );
}
