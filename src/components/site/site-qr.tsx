"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone, Wifi, QrCode as QrIcon } from "lucide-react";
import { usePrefs } from "@/lib/prefs";

/** تولید کد QR از آدرس فعلی سایت */
export function SiteQr({ size = 220 }: { size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- خواندن origin مرورگر پس از مونت
    setOrigin(window.location.origin);
    QRCode.toDataURL(window.location.origin, {
      width: size * 2,
      margin: 2,
      color: { dark: "#0b5d51", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [size]);

  if (!dataUrl) {
    return (
      <div
        className="rounded-2xl bg-secondary animate-pulse flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <QrIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="text-center">
      <img
        src={dataUrl}
        alt={`کد QR نصب سامانه — ${origin}`}
        width={size}
        height={size}
        className="rounded-2xl border-4 border-white shadow-lg bg-white"
      />
      <div className="mt-2 text-[11px] text-muted-foreground break-all" dir="ltr">
        {origin}
      </div>
    </div>
  );
}

/** کارت معرفی نصب اپ موبایل برای نمایش در صفحات دیگر */
export function AppPromoCard() {
  const { t } = usePrefs();
  return (
    <div className="rounded-2xl emerald-gradient pattern-bg p-6 text-white flex flex-col sm:flex-row items-center gap-5">
      <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
        <Smartphone className="h-8 w-8 text-gold" />
      </div>
      <div className="flex-1 text-center sm:text-right">
        <h3 className="font-extrabold text-sm mb-1">
          {t("app.promoTitle", "سامانه را روی گوشی خود نصب کنید")}
        </h3>
        <p className="text-xs text-white/70 leading-6">
          {t(
            "app.promoBody",
            "نسخهٔ اپ موبایل (PWA) با نمایش تمام‌صفحه و دسترسی آفلاین — بدون نیاز به فروشگاه اپلیکیشن."
          )}
        </p>
      </div>
      <a
        href="/app"
        className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white text-primary text-xs font-bold px-4 py-2.5 hover:bg-gold hover:text-accent-foreground transition-colors"
      >
        <Wifi className="h-4 w-4" />
        {t("app.promoLink", "راهنمای نصب و QR")}
      </a>
    </div>
  );
}
