/* ============ Hamroh — oʻzak ============
   Modullar shu yerdagi H obʼyektiga ulanadi. Har bir modul oʻz maʼlumotini
   H.store orqali saqlaydi: avval qurilma xotirasiga, keyin (agar mavjud boʻlsa)
   Claude hisobiga — shunda telefon va kompyuter bir xil maʼlumotni koʻradi. */
window.H = (function () {
  const H = {};

  /* ---------- kichik yordamchilar ---------- */
  H.esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  H.id = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  H.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  H.pad = n => String(n).padStart(2, "0");

  const DAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  const DAYS_S = ["Yak", "Du", "Se", "Cho", "Pa", "Ju", "Sha"];
  const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun",
                  "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
  H.DAYS = DAYS; H.DAYS_S = DAYS_S; H.MONTHS = MONTHS;

  H.date = d => (d instanceof Date ? d : (d ? new Date(d + "T00:00:00") : new Date()));
  H.iso = d => {
    d = H.date(d);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  H.today = () => H.iso();
  H.shiftDay = (iso, n) => { const d = H.date(iso); d.setDate(d.getDate() + n); return H.iso(d); };
  H.dayDiff = (a, b) => Math.round((H.date(b) - H.date(a)) / 86400000);
  H.fmtDate = iso => { const d = H.date(iso); return d.getDate() + "-" + MONTHS[d.getMonth()]; };
  H.fmtLong = iso => {
    const d = H.date(iso);
    return d.getDate() + "-" + MONTHS[d.getMonth()] + ", " + DAYS[d.getDay()];
  };
  H.monthKey = iso => H.iso(iso).slice(0, 7);
  H.monthDays = key => {                       // "2026-10" → ["2026-10-01", ...]
    const [y, m] = key.split("-").map(Number);
    const n = new Date(y, m, 0).getDate();
    const out = [];
    for (let i = 1; i <= n; i++) out.push(key + "-" + H.pad(i));
    return out;
  };
  H.weekKey = iso => {                         // dushanbadan boshlanadigan hafta
    const d = H.date(iso);
    const off = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - off);
    return H.iso(d);
  };
  H.hm = mins => H.pad(Math.floor(mins / 60)) + ":" + H.pad(Math.round(mins % 60));
  H.toMin = hm => { const p = String(hm || "").split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); };
  H.nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  H.plural = (n, w) => n + " " + w;
  H.TOUCH = !!(window.matchMedia && window.matchMedia("(hover:none)").matches);

  /* eski kirill qiymatlarni lotinga oʻtkazish uchun */
  const CYR2LAT = { "а":"a","б":"b","в":"v","г":"g","ғ":"gʻ","д":"d","е":"e","ё":"yo","ж":"j",
    "з":"z","и":"i","й":"y","к":"k","қ":"q","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r",
    "с":"s","т":"t","у":"u","ў":"oʻ","ф":"f","х":"x","ҳ":"h","ц":"ts","ч":"ch","ш":"sh",
    "щ":"shch","ъ":"ʼ","ы":"i","ь":"","э":"e","ю":"yu","я":"ya" };
  H.toLatin = function (text) {
    if (!text) return text;
    let out = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], low = ch.toLowerCase(), rep = CYR2LAT[low];
      if (rep === undefined) { out += ch; continue; }
      if (ch === low) { out += rep; continue; }
      const nx = text[i + 1] || "";
      const caps = nx && nx === nx.toUpperCase() && nx !== nx.toLowerCase();
      out += caps ? rep.toUpperCase() : (rep.charAt(0).toUpperCase() + rep.slice(1));
    }
    return out;
  };

  /* ---------- saqlash ---------- */
  const PREFIX = "hamroh:";
  const cache = {}, defs = {}, timers = {};
  let cloudDb = null;

  H.store = {
    /* ns — modul nomi, def — boshlangʻich qiymat */
    get(ns, def) {
      if (def) defs[ns] = def;
      const base = () => JSON.parse(JSON.stringify(defs[ns] || {}));
      if (!(ns in cache)) {
        let v = null;
        try { const raw = localStorage.getItem(PREFIX + ns); if (raw) v = JSON.parse(raw); } catch (e) {}
        cache[ns] = (v && typeof v === "object") ? Object.assign(base(), v) : base();
      } else if (def) {
        /* keyinroq kelgan boshlangʻich qiymatlar — yetishmagan kalitlarni toʻldiramiz */
        Object.keys(def).forEach(k => {
          if (!(k in cache[ns])) cache[ns][k] = JSON.parse(JSON.stringify(def[k]));
        });
      }
      return cache[ns];
    },
    set(ns, data) { cache[ns] = data; this.save(ns); },
    save(ns) {
      const v = cache[ns];
      if (!v) return;
      v._u = Date.now();
      try {
        localStorage.setItem(PREFIX + ns, JSON.stringify(v));
      } catch (e) {
        /* xotira toʻlsa — jim qolmaymiz, aks holda maʼlumot yoʻqoladi */
        if (!H._quotaWarned) {
          H._quotaWarned = true;
          setTimeout(() => alert(
            "Qurilma xotirasi toʻldi — soʻnggi oʻzgarish saqlanmadi.\n\n" +
            "Sozlama → «Faylga nusxa olish» orqali zahira oling, soʻng " +
            "shajaradagi ayrim suratlarni oʻchirib xotirani boʻshating."), 0);
        }
      }
      if (cloudDb) {
        clearTimeout(timers[ns]);
        timers[ns] = setTimeout(() => {
          try { cloudDb.doc("data/users/me/" + ns).set(v).catch(() => {}); } catch (e) {}
        }, 1200);
      }
      H.emit("save", ns);
    },
    all() {
      const out = {};
      Object.keys(cache).forEach(ns => { out[ns] = cache[ns]; });
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) {
            const ns = k.slice(PREFIX.length);
            if (!(ns in out)) out[ns] = JSON.parse(localStorage.getItem(k));
          }
        }
      } catch (e) {}
      return out;
    },
    restore(obj) {
      Object.keys(obj || {}).forEach(ns => {
        if (!obj[ns] || typeof obj[ns] !== "object") return;
        cache[ns] = obj[ns];
        try { localStorage.setItem(PREFIX + ns, JSON.stringify(obj[ns])); } catch (e) {}
        if (cloudDb) { try { cloudDb.doc("data/users/me/" + ns).set(obj[ns]).catch(() => {}); } catch (e) {} }
      });
    },
    wipe(ns) {
      delete cache[ns];
      try { localStorage.removeItem(PREFIX + ns); } catch (e) {}
    }
  };

  /* Claude hisobi bilan sinxronlash — boʻlmasa ilova baribir ishlayveradi */
  H.cloud = {
    on: false,
    async init() {
      const c = window.claude;
      if (!c || typeof c.use !== "function") return;
      let db = null;
      try { db = await c.use("db"); } catch (e) {}
      if (!db) return;
      cloudDb = db; this.on = true;
      const names = Object.keys(cache);
      for (const ns of names) {
        try {
          const snap = await db.doc("data/users/me/" + ns).get();
          const data = snap && snap.exists ? snap.data() : null;
          if (data && typeof data._u === "number" && data._u > (cache[ns]._u || 0)) {
            cache[ns] = Object.assign(JSON.parse(JSON.stringify(defs[ns] || {})), data);
            try { localStorage.setItem(PREFIX + ns, JSON.stringify(cache[ns])); } catch (e) {}
          }
        } catch (e) {}
      }
      H.emit("cloud");
      H.renderActive();
    }
  };

  /* ---------- oddiy hodisa shinasi ---------- */
  const subs = {};
  H.on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); };
  H.emit = (ev, a) => { (subs[ev] || []).forEach(f => { try { f(a); } catch (e) {} }); };

  /* ---------- modullar va navigatsiya ---------- */
  H.mods = [];
  H.mod = def => { H.mods.push(def); return def; };
  H.byId = id => H.mods.filter(m => m.id === id)[0];

  let active = null;
  H.active = () => active;

  H.go = (id, keepScroll) => {
    const m = H.byId(id); if (!m) return;
    active = id;
    H.mods.forEach(x => {
      const el = document.getElementById("m-" + x.id);
      if (el) el.hidden = x.id !== id;
    });
    document.querySelectorAll(".h-navbtn").forEach(b =>
      b.setAttribute("aria-selected", String(b.dataset.m === id)));
    const el = document.getElementById("m-" + id);
    if (el && !el.dataset.ready) { el.dataset.ready = "1"; if (m.init) m.init(el); }
    if (m.show) m.show(el);
    else if (m.render) m.render(el);
    if (!keepScroll) window.scrollTo({ top: 0, behavior: "smooth" });
    try { localStorage.setItem(PREFIX + "tab", id); } catch (e) {}
  };
  H.renderActive = () => {
    const m = H.byId(active);
    if (!m) return;
    const el = document.getElementById("m-" + active);
    if (m.show) m.show(el); else if (m.render) m.render(el);
  };

  /* ---------- kichik UI yordamchilari ---------- */
  H.bar = (a, b, ok) =>
    '<div class="h-bar' + (ok ? " ok" : "") + '"><i style="width:' +
    H.clamp(b ? Math.round(a / b * 100) : 0, 0, 100) + '%"></i></div>';

  H.ring = (pct, size) => {
    size = size || 34;
    const r = size / 2 - 3, c = 2 * Math.PI * r;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="3"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--green)" stroke-width="3"' +
      ' stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - H.clamp(pct, 0, 1))) + '"' +
      ' transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
  };

  /* kichik chiziqli grafik (vazn, soat va sh.k.) */
  H.spark = (vals, w, h) => {
    w = w || 260; h = h || 48;
    if (!vals || vals.length < 2) return '<p class="h-note">Grafik uchun kamida ikkita yozuv kerak.</p>';
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const span = (max - min) || 1;
    const pts = vals.map((v, i) => {
      const x = 4 + i * (w - 8) / (vals.length - 1);
      const y = h - 6 - (v - min) / span * (h - 14);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" points="' + pts.join(" ") + '"/>' +
      '<circle cx="' + pts[pts.length - 1].split(",")[0] + '" cy="' + pts[pts.length - 1].split(",")[1] +
      '" r="3" fill="var(--accent)"/></svg>';
  };

  /* ---------- faylga saqlash / fayldan tiklash ---------- */
  H.download = async (filename, text) => {
    const c = window.claude;
    if (c && typeof c.use === "function") {
      try {
        const dl = await c.use("downloads");
        if (dl) { await dl.save({ filename, data: text }); return true; }
      } catch (e) {}
    }
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return true;
    } catch (e) { return false; }
  };

  return H;
})();
