/* Қадам — оффлайн ишлаши учун service worker.
   CACHE номини build.mjs ҳар йиғишда янгилайди. */
const CACHE = "qadam-202610151251";
const CORE = ["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./css/app.css","./css/mod.css","./css/til.css","./js/boot.js","./js/bugun.js","./js/core.js","./js/ish.js","./js/langs/ar.js","./js/langs/de.js","./js/langs/en.js","./js/langs/ja.js","./js/langs/kk.js","./js/langs/ko.js","./js/langs/more.js","./js/langs/ru.js","./js/langs/zh.js","./js/namoz.js","./js/oila.js","./js/shajara.js","./js/sozlama.js","./js/sport.js","./js/til.js"];

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

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // Ўз js/css файлларимиз: аввал тармоқ, узилса — кэш.
  // Шундай қилинмаса, янгиланишдан кейин эски код илиб қолади.
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

  // Шрифтлар, расмлар: аввал кэш, бўлмаса тармоқдан олиб кэшга ёзамиз
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
