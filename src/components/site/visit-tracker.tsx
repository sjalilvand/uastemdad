"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * ثبت آمار بازدید صفحات — در هر مسیریابی یک رویداد به /api/track ارسال می‌کند.
 * شناسه بازدیدکننده در localStorage نگهداری می‌شود (بدون کوکی ردیابی شخصی).
 */
export function VisitTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;

    // صفحات مدیریتی و پیش‌نمایش شمارش نمی‌شوند
    if (pathname.startsWith("/admin")) return;

    const visitorId = (() => {
      try {
        let id = localStorage.getItem("uast_visitor_id");
        if (!id) {
          id = Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem("uast_visitor_id", id);
        }
        return id;
      } catch {
        return "anonymous";
      }
    })();

    const payload = {
      visitorId,
      path: pathname,
      referrer: document.referrer || "",
      title: document.title || "",
      screen: `${window.innerWidth}x${window.innerHeight}`,
    };

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
