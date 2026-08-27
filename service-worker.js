/* ============================================================
   LearnHub Service Worker
   - HTML (navigation): network-first → offline fallback cache
   - Tài nguyên tĩnh cùng origin: cache-first + cập nhật ngầm (SWR)
   - Bỏ qua mọi request cross-origin (Supabase, CDN, YouTube...)
   ============================================================ */

const CACHE_VERSION = "learnhub-v6";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/style.css",
  "/account-popup.css",
  "/account-popup.js",
  "/script.js",
  "/toast.js",
  "/supabase-config.js",
  "/manifest.json",
  "/service-worker.js",
  "/version/version-check.js",
  "/pictures/favicon.png",
  "/pictures/icons/icon-192.png",
  "/pictures/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase / CDN / font... để trình duyệt tự lo

  const isNavigation = req.mode === "navigate"
    || (req.headers.get("accept") || "").includes("text/html")
    || url.pathname === "/"
    || url.pathname.endsWith(".html");

  // File phiên bản (version-check.js, version.json) luôn ưu tiên mạng:
  // nếu để cache-first thì sau khi reload trang vẫn chạy LH_VERSION cũ
  // trong khi version.json đã mới => banner "Tải lại" hiện lặp lại 2 lần.
  const isVersionAsset = url.pathname.indexOf("/version/") === 0;

  if (isNavigation || isVersionAsset) {
    // Trang HTML + file phiên bản: ưu tiên mạng để luôn nhận bản mới sau deploy, offline thì dùng cache
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Không cache các URL poll có query (?t=timestamp) — tránh phình Cache Storage
          if (isNavigation && !url.search) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/index.html"))
        )
    );
    return;
  }

  // Tài nguyên tĩnh: trả từ cache ngay (nhanh), đồng thời tải bản mới cập nhật ngầm
  event.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
