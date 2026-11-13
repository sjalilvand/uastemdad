"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** ثبت سرویس‌ورکر PWA در کل سایت + به‌روزرسانی خودکار هنگام انتشار نسخهٔ جدید */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // فقط در HTTPS یا لوکال‌هاست فعال می‌شود
    const isSecure =
      location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";
    if (!isSecure) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          // اگر نسخهٔ جدیدی در حال نصب است، فوراً فعال شود
          if (registration.waiting && navigator.serviceWorker.controller) {
            registration.waiting.postMessage("SKIP_WAITING");
          }
          registration.addEventListener("updatefound", () => {
            const nw = registration.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                nw.postMessage("SKIP_WAITING");
              }
            });
          });
        })
        .catch((e) => {
          console.warn("SW registration failed:", e);
        });

      // پس از فعال‌شدن سرویس‌ورکر جدید، صفحه یک‌بار تازه‌سازی می‌شود
      let refreshed = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshed) return;
        try {
          if (sessionStorage.getItem("uast_sw_reload") === "1") return;
          sessionStorage.setItem("uast_sw_reload", "1");
        } catch {
          /* ignore */
        }
        refreshed = true;
        window.location.reload();
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}

/** دکمهٔ نصب اپلیکیشن — در صورت پشتیبانی مرورگر نمایش داده می‌شود */
export function InstallAppButton({
  variant = "default",
  size = "default",
  className = "",
}: {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { t } = usePrefs();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setPromptEvent(null);
    });
    // اگر از قبل نصب شده (حالت standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- بررسی همگام حالت نصب خارج از رندر
      setInstalled(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed) {
    return (
      <Button variant="outline" size={size} disabled className={`gap-2 ${className}`}>
        <Smartphone className="h-4 w-4" />
        {t("app.installed")}
      </Button>
    );
  }

  const onClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setPromptEvent(null);
    } else {
      // راهنمای دستی برای مرورگرهایی که beforeinstallprompt ندارند (مثل iOS)
      window.location.href = "/app";
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      className={`gap-2 ${className}`}
    >
      <Download className="h-4 w-4" />
      {t("app.install")}
    </Button>
  );
}
