/* Qadam — offlayn ishlashi uchun service worker.
   CACHE nomini build.mjs har yigʻishda yangilaydi. */
const CACHE = "qadam-202610240424";
const CORE = ["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./css/app.css?v=202610240424","./css/mod.css?v=202610240424","./css/til.css?v=202610240424","./js/boot.js?v=202610240424","./js/bugun.js?v=202610240424","./js/core.js?v=202610240424","./js/ish.js?v=202610240424","./js/langs/ar.js?v=202610240424","./js/langs/de.js?v=202610240424","./js/langs/en.js?v=202610240424","./js/langs/ja.js?v=202610240424","./js/langs/kk.js?v=202610240424","./js/langs/ko.js?v=202610240424","./js/langs/more.js?v=202610240424","./js/langs/ru.js?v=202610240424","./js/langs/zh.js?v=202610240424","./js/namoz.js?v=202610240424","./js/oila.js?v=202610240424","./js/shajara.js?v=202610240424","./js/sozlama.js?v=202610240424","./js/sport.js?v=202610240424","./js/til.js?v=202610240424"];

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
