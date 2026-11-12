import type { MetadataRoute } from "next";

/** مانیفست PWA — امکان نصب سامانه به‌عنوان اپ موبایل */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره)",
    short_name: "علمی–کاربردی امداد",
    description:
      "سامانه رسمی مرکز آموزش علمی–کاربردی کمیته امداد: اخبار، اطلاعیه‌ها، رشته‌های تحصیلی، فرم‌ها و دستیار هوشمند",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f2",
    theme_color: "#0b5d51",
    categories: ["education"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "اخبار مرکز",
        url: "/news",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "اطلاعیه‌ها",
        url: "/announcements",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "عضویت دانشجویان",
        url: "/membership",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
