import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircleQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "پرسش‌های متداول" };

export default async function FaqPage() {
  const faqs = await db.faq.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <PageHeader
        title="پرسش‌های متداول"
        subtitle="پاسخ پرتکرارترین پرسش‌های دانشجویان، اساتید و متقاضیان ثبت‌نام"
        breadcrumb={[{ label: "پرسش‌های متداول" }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {faqs.length === 0 ? (
          <div className="rounded-2xl bg-secondary/50 border border-dashed border-border p-14 text-center">
            <MessageCircleQuestion className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              هنوز پرسشی ثبت نشده است؛ پرسش‌ها از پنل مدیریت قابل افزودن هستند.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-4 md:p-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-right text-sm font-bold leading-7 hover:text-primary hover:no-underline">
                    <span className="flex items-start gap-3">
                      <span className="shrink-0 h-6 w-6 rounded-lg bg-secondary text-primary text-[11px] font-extrabold flex items-center justify-center mt-0.5">
                        {(i + 1).toLocaleString("fa-IR")}
                      </span>
                      {f.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-8 pr-9">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </>
  );
}
