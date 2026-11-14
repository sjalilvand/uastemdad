import { getSettings, getPhones } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { ContactForm } from "@/components/site/contact-form";
import { HomeMap } from "@/components/site/home-map";
import { getLocale, serverT } from "@/lib/server-i18n";
import { MapPin, Phone, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const locale = await getLocale();
  const T = serverT(locale);
  const settings = await getSettings();
  const phones = getPhones(settings);
  const lat = Number(settings.mapLat) || 35.74041;
  const lng = Number(settings.mapLng) || 51.49027;

  return (
    <>
      <PageHeader
        title={T("contact.title", "ارتباط با مرکز")}
        subtitle={T(
          "contact.subtitle",
          "آدرس، تلفن‌های تماس و فرم ارتباط مستقیم با دفتر مرکز آموزش علمی–کاربردی کمیته امداد"
        )}
        breadcrumb={[{ label: T("top.contact") }]}
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
                <h3 className="font-bold text-foreground text-sm mb-1.5">
                  {T("home.addressTitle")}
                </h3>
                <p className="text-sm text-muted-foreground leading-7">
                  {settings.address}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 hover-lift">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center shrink-0">
                <Phone className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1.5">
                  {T("home.phonesTitle")}
                </h3>
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
                <h3 className="font-bold text-foreground text-sm mb-1.5">
                  {T("contact.emailTitle", "پست الکترونیک")}
                </h3>
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
            <h3 className="font-bold text-sm mb-2">
              {T("contact.buildingGuide", "راهنمای طبقات ساختمان")}
            </h3>
            <p className="text-xs text-white/70 leading-6">
              {settings.buildingGuide ||
                T(
                  "contact.buildingGuideBody",
                  "واحدهای اداری در همکف، کلاس‌ها در طبقات اول تا سوم و سالن کنفرانس و ریاست در طبقه چهارم قرار دارند. راهنمای کامل در منوی «درباره مرکز» موجود است."
                )}
            </p>
          </div>
        </div>

        {/* نقشه و فرم */}
        <div className="lg:col-span-3 space-y-6">
          <HomeMap
            lat={lat}
            lng={lng}
            address={settings.address}
            destName={settings.mapDestName || undefined}
            customMapUrl={settings.mapUrl || undefined}
          />
          <ContactForm />
        </div>
      </div>
    </>
  );
}
