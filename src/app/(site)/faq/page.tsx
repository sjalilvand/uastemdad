import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircleQuestion } from "lucide-react";
import { getLocale, serverT } from "@/lib/server-i18n";
import { translateBatch, isTargetLocale } from "@/lib/translate";

export const dynamic = "force-dynamic";

export const metadata = { title: "پرسش‌های متداول" };

export default async function FaqPage() {
  const locale = await getLocale();
  const T = serverT(locale);
  const faqsRaw = await db.faq.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  let faqs = faqsRaw;
  if (isTargetLocale(locale)) {
    const map = await translateBatch(
      faqsRaw.flatMap((f) => [f.question, f.answer]).filter(Boolean),
      locale
    );
    faqs = faqsRaw.map((f) => ({
      ...f,
      question: map.get(f.question.trim()) || f.question,
      answer: map.get(f.answer.trim()) || f.answer,
    }));
  }

  return (
    <>
      <PageHeader
        title={T("faq.title")}
        subtitle={T("faq.subtitle")}
        breadcrumb={[{ label: T("faq.title") }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {faqs.length === 0 ? (
          <div className="rounded-2xl bg-secondary/50 border border-dashed border-border p-14 text-center">
            <MessageCircleQuestion className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {T("faq.empty")}
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
                        {locale === "fa"
                          ? (i + 1).toLocaleString("fa-IR")
                          : locale === "ar"
                            ? (i + 1).toLocaleString("ar")
                            : String(i + 1)}
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
