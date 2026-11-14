/* Service Worker سامانه uastemdad — نسخهٔ ۳
   ─────────────────────────────────────────
   تغییرات نسخهٔ ۳ (رفع خطای ERR_CONNECTION_REFUSED):
   ۱) در لوکال (حالت توسعه) هیچ صفحه‌ای کش نمی‌شود؛ بنابراین وقتی سرور خاموش است
      به‌جای نسخهٔ قدیمی و خراب، صفحهٔ راهنمای «سرور در دسترس نیست» نمایش داده می‌شود.
   ۲) درخواست‌های Turbopack/HMR حالت توسعه هرگز دستکاری نمی‌شوند.
   ۳) خطای fetch داخل هندلرها بی‌صدا مدیریت می‌شود (بدون استثنای uncaught در کنسول).
   ۴) مانیفست، آیکون‌ها و لوگو هم precache می‌شوند.
   با افزایش شمارهٔ VERSION، کش‌های نسخهٔ قبلی (از جمله HTML قدیمی dev) به‌صورت
   خودکار در اولین فعال‌سازی حذف می‌شوند. */
const VERSION = "uast-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";

/* در حالت توسعه (localhost) فایل‌های _next/static نام پایدار ندارند و
   محتوایشان بین اجراها تغییر می‌کند؛ کش‌کردن آنها باعث اختلاط کد قدیم و
   جدید و خطای hydration می‌شود. بنابراین در لوکال، استاتیک و صفحه‌ها هرگز کش نمی‌شوند. */
const IS_LOCAL =
  self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

// فایل‌های پایه که در نصب کش می‌شوند (همیشه تغییرناپذیرند)
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/images/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/fonts/Vazirmatn-Regular.woff2",
  "/fonts/Vazirmatn-Bold.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // اگر یکی از فایل‌ها در دسترس نبود، نصب متوقف نمی‌شود
        Promise.allSettled(PRECACHE.map((u) => cache.add(u)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// پیام SKIP_WAITING از صفحه برای به‌روزرسانی فوری
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** اطلاع به صفحه‌های باز که محتوا از کش (نه از سرور زنده) ارائه شده است */
function notifyStale() {
  self.clients
    .matchAll({ includeUncontrolled: true, type: "window" })
    .then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "OFFLINE_FALLBACK" });
      }
    });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // مسیرهای مدیریتی و API هرگز کش نمی‌شوند
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  // درخواست‌های حالت توسعه (Turbopack / HMR / webpack-dev) هرگز کش نمی‌شوند
  if (
    url.pathname.includes("[turbopack]") ||
    url.pathname.includes("%5Bturbopack%5D") ||
    url.pathname.startsWith("/_next/webpack")
  ) {
    return;
  }

  // در لوکال (حالت توسعه) فایل‌های استاتیک Next بدون کش — جلوگیری از کد قدیمی
  if (IS_LOCAL && url.pathname.startsWith("/_next/")) return;

  /* ------------------------------ صفحه‌ها ------------------------------ */
  if (request.mode === "navigate") {
    if (IS_LOCAL) {
      // حالت توسعه: همیشه مستقیم از سرور.
      // اگر سرور (npm run dev:3003) در حال اجرا نباشد، به‌جای نسخهٔ قدیمی کش‌شده
      // صفحهٔ راهنمای شفاف نمایش داده می‌شود تا کاربر بداند سرور خاموش است.
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
      return;
    }
    // نسخهٔ منتشرشده: ابتدا شبکه، در نبود شبکه نسخهٔ ذخیره‌شده + هشدار به صفحه
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(request);
          if (hit) {
            notifyStale();
            return hit;
          }
          return (await caches.match(OFFLINE_URL)) || Response.error();
        })
    );
    return;
  }

  /* ------------------ دارایی‌های تغییرناپذیر (کش اول) ------------------ */
  // در بیلد production فایل‌های _next/static هش محتوا دارند و امن است
  const cacheable =
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/images") ||
    url.pathname.startsWith("/fonts") ||
    url.pathname.startsWith("/media") ||
    url.pathname.startsWith("/uploads") ||
    url.pathname === "/manifest.webmanifest" ||
    (!IS_LOCAL && url.pathname.startsWith("/_next/static"));

  if (cacheable) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request)
            .then((res) => {
              if (res && res.ok && res.type === "basic") {
                const copy = res.clone();
                caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
              }
              return res;
            })
            // خطای شبکه بی‌صدا: پاسخ خطا به مرورگر برگردانده می‌شود،
            // بدون استثنای uncaught در کنسول سرویس‌ورکر
            .catch(() => Response.error())
      )
    );
  }
});
