/* Қадам — оффлайн ишлаши учун service worker.
   CACHE номини build.mjs ҳар йиғишда янгилайди. */
const CACHE = "qadam-202610231417";
const CORE = ["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./css/app.css?v=202610231417","./css/mod.css?v=202610231417","./css/til.css?v=202610231417","./js/boot.js?v=202610231417","./js/bugun.js?v=202610231417","./js/core.js?v=202610231417","./js/ish.js?v=202610231417","./js/langs/ar.js?v=202610231417","./js/langs/de.js?v=202610231417","./js/langs/en.js?v=202610231417","./js/langs/ja.js?v=202610231417","./js/langs/kk.js?v=202610231417","./js/langs/ko.js?v=202610231417","./js/langs/more.js?v=202610231417","./js/langs/ru.js?v=202610231417","./js/langs/zh.js?v=202610231417","./js/namoz.js?v=202610231417","./js/oila.js?v=202610231417","./js/shajara.js?v=202610231417","./js/sozlama.js?v=202610231417","./js/sport.js?v=202610231417","./js/til.js?v=202610231417"];

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

  // version.json doim tarmoqdan - yangilanishni shu fayl aniqlaydi
  if (sameOrigin && url.pathname.indexOf("version.json") >= 0) {
    e.respondWith(fetch(req).catch(() => new Response('{"version":""}', { status: 200 })));
    return;
  }

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
