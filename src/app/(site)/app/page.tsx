import { PageHeader } from "@/components/site/page-header";
import { SiteQr, AppPromoCard } from "@/components/site/site-qr";
import { InstallAppButton } from "@/components/site/pwa-register";
import { getSettings } from "@/lib/settings";
import {
  Smartphone,
  Zap,
  WifiOff,
  Maximize,
  BellRing,
  Chrome,
  Share2,
  MonitorDown,
  QrCode as QrIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "نصب اپلیکیشن موبایل" };

export default async function AppInstallPage() {
  const settings = await getSettings();

  const benefits = [
    { icon: Zap, text: "دسترسی سریع با یک لمس از صفحه اصلی گوشی" },
    { icon: WifiOff, text: "کارکرد آفلاین صفحات بازدیدشده" },
    { icon: Maximize, text: "نمایش تمام‌صفحه بدون نوار مرورگر" },
    { icon: BellRing, text: "آمادگی برای اعلان‌های اخبار در نسخه‌های بعدی" },
  ];

  return (
    <>
      <PageHeader
        title="نصب اپلیکیشن موبایل"
        subtitle="سامانه را به‌صورت اپ موبایل (PWA) روی گوشی یا رایانه خود نصب کنید؛ بدون نیاز به فروشگاه اپلیکیشن"
        breadcrumb={[{ label: "نصب اپ موبایل" }]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* معرفی + QR */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card rounded-3xl border border-border shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-xl emerald-gradient flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-foreground">
                  {settings.siteShort}
                </h2>
                <p className="text-xs text-muted-foreground">
                  نسخهٔ اپ موبایل — نصب مستقیم از مرورگر
                </p>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-foreground/85">
                  <span className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-primary" />
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <InstallAppButton size="lg" />
              <span className="text-[11px] text-muted-foreground">
                اگر دکمه کار نکرد، از راهنمای سمت چپ استفاده کنید
              </span>
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border shadow-sm p-6 md:p-8 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2">
              <QrIcon className="h-5 w-5 text-gold" />
              <h2 className="font-extrabold text-foreground">نصب با اسکن QR</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-6 mb-5 max-w-xs">
              کد زیر را با دوربین گوشی اسکن کنید تا سایت باز شود؛ سپس از منوی
              مرورگر گزینهٔ «افزودن به صفحه اصلی» را بزنید.
            </p>
            <SiteQr size={210} />
          </div>
        </div>

        {/* راهنمای پلتفرم‌ها */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <Chrome className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold text-sm mb-2">اندروید (کروم)</h3>
            <ol className="text-xs text-muted-foreground leading-6 list-decimal pr-4 space-y-1">
              <li>سایت را در کروم باز کنید</li>
              <li>منوی سه‌نقطه بالای صفحه را بزنید</li>
              <li>«افزودن به صفحه اصلی» یا «نصب برنامه» را انتخاب کنید</li>
            </ol>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold text-sm mb-2">آیفون / آیپد (سافاری)</h3>
            <ol className="text-xs text-muted-foreground leading-6 list-decimal pr-4 space-y-1">
              <li>سایت را در سافاری باز کنید</li>
              <li>دکمه اشتراک‌گذاری (مربع با پیکان) را بزنید</li>
              <li>گزینهٔ Add to Home Screen را انتخاب کنید</li>
            </ol>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <MonitorDown className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold text-sm mb-2">رایانه (کروم / اج)</h3>
            <ol className="text-xs text-muted-foreground leading-6 list-decimal pr-4 space-y-1">
              <li>آیکن نصب در انتهای نوار آدرس را ببینید</li>
              <li>روی آن کلیک و «نصب» را تأیید کنید</li>
              <li>اپ به‌صورت پنجره مستقل اجرا می‌شود</li>
            </ol>
          </div>
        </div>

        <AppPromoCard />
      </div>
    </>
  );
}
