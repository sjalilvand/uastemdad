/* Service Worker سامانه uastemdad — کش آفلاین و بارگذاری سریع */
const VERSION = "uast-v2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";

/* در حالت توسعه (localhost) فایل‌های _next/static نام پایدار ندارند و
   محتوایشان بین اجراها تغییر می‌کند؛ کش‌کردن آنها باعث اختلاط کد قدیم و
   جدید و خطای hydration می‌شود. بنابراین در لوکال، استاتیک هرگز کش نمی‌شود. */
const IS_LOCAL =
  self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

// فایل‌های پایه که در نصب کش می‌شوند (همیشه تغییرناپذیرند)
const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fonts/Vazirmatn-Regular.woff2",
  "/fonts/Vazirmatn-Bold.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // مسیرهای مدیریتی و API هرگز کش نمی‌شوند
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  // در لوکال (حالت توسعه) فایل‌های استاتیک Next بدون کش — جلوگیری از کد قدیمی
  if (IS_LOCAL && url.pathname.startsWith("/_next/")) return;

  // صفحات: ابتدا شبکه، در خطا کش، و در آفلاین صفحهٔ آفلاین
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // دارایی‌های تغییرناپذیر (فونت، آیکون، تصویر): کش اول
  // در بیلد production فایل‌های _next/static هش محتوا دارند و امن است
  const cacheable =
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/images") ||
    url.pathname.startsWith("/fonts") ||
    url.pathname.startsWith("/uploads") ||
    (!IS_LOCAL && url.pathname.startsWith("/_next/static"));

  if (cacheable) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});
