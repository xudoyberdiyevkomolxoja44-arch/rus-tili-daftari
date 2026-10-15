/* Рус тили дафтари — оффлайн ишлаши учун service worker.
   CACHE номини build.mjs ҳар йиғишда янгилайди. */
const CACHE = "hamroh-202610151139";
const CORE = ["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./css/app.css","./css/mod.css","./css/rus.css","./js/boot.js","./js/bugun.js","./js/core.js","./js/ish.js","./js/namoz.js","./js/oila.js","./js/rus.js","./js/shajara.js","./js/sozlama.js","./js/sport.js"];

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

  // Саҳифанинг ўзи: аввал тармоқ, узилса — кэш (янгиланиш дарҳол етиб борсин)
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

  // Қолгани (шрифтлар, иконкалар): аввал кэш, бўлмаса тармоқдан олиб кэшга ёзамиз
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.status === 200 || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => new Response("", { status: 504, statusText: "Оффлайн" })))
  );
});
