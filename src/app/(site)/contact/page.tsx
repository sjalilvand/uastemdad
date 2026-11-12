import { getSettings, getPhones } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { ContactForm } from "@/components/site/contact-form";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const settings = await getSettings();
  const phones = getPhones(settings);

  return (
    <>
      <PageHeader
        title="ارتباط با مرکز"
        subtitle="آدرس، تلفن‌های تماس و فرم ارتباط مستقیم با دفتر مرکز آموزش علمی–کاربردی کمیته امداد"
        breadcrumb={[{ label: "تماس با ما" }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-8 lg:grid-cols-5">
        {/* اطلاعات تماس */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 hover-lift">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0">
                <MapPin className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1.5">نشانی مرکز</h3>
                <p className="text-sm text-muted-foreground leading-7">
                  {settings.address}
                </p>
                <a
                  href={settings.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-gold transition-colors"
                >
                  مشاهده روی نقشه
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 hover-lift">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0">
                <Phone className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1.5">تلفن‌های تماس</h3>
                <ul className="space-y-1">
                  {phones.map((p) => (
                    <li key={p}>
                      <a
                        href={`tel:${p.replace(/\s/g, "")}`}
                        dir="ltr"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block"
                      >
                        {p}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 hover-lift">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0">
                <Mail className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1.5">پست الکترونیک</h3>
                <a
                  href={`mailto:${settings.email}`}
                  dir="ltr"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block"
                >
                  {settings.email}
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl emerald-gradient pattern-bg p-6 text-white">
            <h3 className="font-bold text-sm mb-2">راهنمای طبقات ساختمان</h3>
            <p className="text-xs text-white/70 leading-6">
              واحدهای اداری در همکف، کلاس‌ها در طبقات اول تا سوم و سالن کنفرانس و
              ریاست در طبقه چهارم قرار دارند. راهنمای کامل در منوی «درباره مرکز»
              موجود است.
            </p>
          </div>
        </div>

        {/* فرم */}
        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </div>
    </>
  );
}
