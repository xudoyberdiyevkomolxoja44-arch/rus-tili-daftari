/* Qadam — offlayn ishlashi uchun service worker.
   CACHE nomini build.mjs har yigʻishda yangilaydi. */
const CACHE = "qadam-202610250717";
const CORE = ["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./css/app.css?v=202610250717","./css/fon.css?v=202610250717","./css/mod.css?v=202610250717","./css/rul.css?v=202610250717","./css/til.css?v=202610250717","./js/boot.js?v=202610250717","./js/bugun.js?v=202610250717","./js/cloud.js?v=202610250717","./js/core.js?v=202610250717","./js/eslatma.js?v=202610250717","./js/firebase-config.js?v=202610250717","./js/ish.js?v=202610250717","./js/langs/ar.js?v=202610250717","./js/langs/de.js?v=202610250717","./js/langs/en.js?v=202610250717","./js/langs/ja.js?v=202610250717","./js/langs/kk.js?v=202610250717","./js/langs/ko.js?v=202610250717","./js/langs/more.js?v=202610250717","./js/langs/ru.js?v=202610250717","./js/langs/zh.js?v=202610250717","./js/namoz.js?v=202610250717","./js/oila.js?v=202610250717","./js/rul.js?v=202610250717","./js/shajara.js?v=202610250717","./js/sozlama.js?v=202610250717","./js/sport.js?v=202610250717","./js/til.js?v=202610250717"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Sahifaning oʻzi: avval tarmoq, uzilsa — kesh (yangilanish darhol yetib borsin)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // version.json doim tarmoqdan - yangilanishni shu fayl aniqlaydi
  if (sameOrigin && url.pathname.indexOf("version.json") >= 0) {
    e.respondWith(fetch(req).catch(() => new Response('{"version":""}', { status: 200 })));
    return;
  }

  // Oʻz js/css fayllarimiz: avval tarmoq, uzilsa — kesh.
  // Shunday qilinmasa, yangilanishdan keyin eski kod ilib qoladi.
  if (sameOrigin && /\.(js|css|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || new Response("", { status: 504 })))
    );
    return;
  }

  // Shriftlar, rasmlar: avval kesh, boʻlmasa tarmoqdan olib keshga yozamiz
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.status === 200 || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => new Response("", { status: 504, statusText: "Offlayn" })))
  );
});
