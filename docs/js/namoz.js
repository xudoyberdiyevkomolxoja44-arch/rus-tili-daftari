/* ============ Namoz ============
   Vaqtlar quyoshning holatidan hisoblanadi (internet kerak emas).
   Mahalliy taqvimdan farq qilsa, sozlamalardagi ± daqiqa tuzatishi ishlatiladi. */
(function (H) {
  const NS = "namoz";
  const PRAYERS = [
    ["bomdod", "Bomdod"], ["peshin", "Peshin"], ["asr", "Asr"],
    ["shom", "Shom"], ["xufton", "Xufton"]
  ];
  const STATES = [["jamoat", "Jamoat", "ok"], ["yakka", "Yakka", ""], ["qazo", "Qazo", "warn"]];
  const METHODS = {
    ca:    { name: "Markaziy Osiyo (18° / 18°)", fajr: 18, isha: 18 },
    mwl:   { name: "Jahon musulmonlar ligasi (18° / 17°)", fajr: 18, isha: 17 },
    umm:   { name: "Ummu-l-Quro (18.5° / shomdan +90 daq.)", fajr: 18.5, ishaMin: 90 },
    misr:  { name: "Misr (19.5° / 17.5°)", fajr: 19.5, isha: 17.5 }
  };
  const CITIES = [
    ["Toshkent", 41.2995, 69.2401], ["Samarqand", 39.6270, 66.9750], ["Buxoro", 39.7747, 64.4286],
    ["Namangan", 41.0011, 71.6673], ["Andijon", 40.7821, 72.3442], ["Fargʻona", 40.3864, 71.7864],
    ["Qoʻqon", 40.5283, 70.9425], ["Margʻilon", 40.4714, 71.7244], ["Nukus", 42.4531, 59.6103],
    ["Urganch", 41.5500, 60.6333], ["Xiva", 41.3783, 60.3639], ["Qarshi", 38.8606, 65.7847],
    ["Termiz", 37.2242, 67.2783], ["Jizzax", 40.1158, 67.8422], ["Guliston", 40.4897, 68.7842],
    ["Navoiy", 40.0844, 65.3792], ["Zarafshon", 41.5872, 64.2050], ["Nurafshon", 41.0400, 69.3600]
  ];
  const DEF = {
    log: {}, qazo: { bomdod: 0, peshin: 0, asr: 0, shom: 0, xufton: 0 },
    cfg: {
      city: "Toshkent", lat: 41.2995, lon: 69.2401, method: "ca", asr: "hanafiy",
      adj: { bomdod: 0, quyosh: 0, peshin: 0, asr: 0, shom: 0, xufton: 0 }
    }
  };
  H.store.get(NS, DEF);          /* boshlangʻich qiymatni darhol roʻyxatdan oʻtkazamiz */
  const d2r = Math.PI / 180;
  const dsin = d => Math.sin(d * d2r), dcos = d => Math.cos(d * d2r), dtan = d => Math.tan(d * d2r);
  const asind = x => Math.asin(x) / d2r, acosd = x => Math.acos(x) / d2r;
  const atan2d = (y, x) => Math.atan2(y, x) / d2r, acotd = x => Math.atan2(1, x) / d2r;
  const fixAngle = a => ((a % 360) + 360) % 360;
  const fixHour = a => ((a % 24) + 24) % 24;

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sun(jd) {
    const D = jd - 2451545.0;
    const g = fixAngle(357.529 + 0.98560028 * D);
    const q = fixAngle(280.459 + 0.98564736 * D);
    const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = fixHour(atan2d(dcos(e) * dsin(L), dcos(L)) / 15);
    return { decl: asind(dsin(e) * dsin(L)), eqt: q / 15 - RA };
  }
  /* quyosh berilgan burchakda boʻladigan vaqt (soatlarda) */
  function angleTime(jd, lat, angle, t, before) {
    const s = sun(jd + t);
    const noon = fixHour(12 - s.eqt);
    const x = (-dsin(angle) - dsin(s.decl) * dsin(lat)) / (dcos(s.decl) * dcos(lat));
    if (x > 1 || x < -1) return NaN;              // qutb yaqinidagi holat
    const T = acosd(x) / 15;
    return noon + (before ? -T : T);
  }
  function asrTime(jd, lat, factor, t) {
    const s = sun(jd + t);
    return angleTime(jd, lat, -acotd(factor + dtan(Math.abs(lat - s.decl))), t, false);
  }

  /* daqiqalarda (yarim tundan) qaytaradi */
  H.namozTimes = function (iso, cfg) {
    cfg = cfg || H.store.get(NS, DEF).cfg;
    const d = H.date(iso || H.today());
    const tz = -d.getTimezoneOffset() / 60;
    const m = METHODS[cfg.method] || METHODS.ca;
    const factor = cfg.asr === "shofeiy" ? 1 : 2;
    const jd = julian(d.getFullYear(), d.getMonth() + 1, d.getDate()) - cfg.lon / (15 * 24);
    let t = { bomdod: 5 / 24, quyosh: 6 / 24, peshin: 12 / 24, asr: 13 / 24, shom: 18 / 24, xufton: 19 / 24 };
    for (let i = 0; i < 3; i++) {
      const v = {
        bomdod: angleTime(jd, cfg.lat, m.fajr, t.bomdod, true),
        quyosh: angleTime(jd, cfg.lat, 0.833, t.quyosh, true),
        peshin: fixHour(12 - sun(jd + t.peshin).eqt),
        asr: asrTime(jd, cfg.lat, factor, t.asr),
        shom: angleTime(jd, cfg.lat, 0.833, t.shom, false),
        xufton: m.ishaMin ? NaN : angleTime(jd, cfg.lat, m.isha, t.xufton, false)
      };
      if (m.ishaMin) v.xufton = v.shom + m.ishaMin / 60;
      t = {}; Object.keys(v).forEach(k => { t[k] = v[k] / 24; });
    }
    const out = {};
    Object.keys(t).forEach(k => {
      let hours = t[k] * 24 + tz - cfg.lon / 15;
      if (!isFinite(hours)) { out[k] = null; return; }
      out[k] = Math.round(hours * 60) + (cfg.adj[k] || 0);
    });
    if (out.peshin != null) out.peshin += 2;        // zuhr — zevoldan 2 daqiqa keyin
    return out;
  };

  H.namozNext = function () {
    const cfg = H.store.get(NS, DEF).cfg;
    const now = H.nowMin(), t = H.namozTimes(H.today(), cfg);
    const order = ["bomdod", "quyosh", "peshin", "asr", "shom", "xufton"];
    for (const k of order) {
      if (t[k] != null && t[k] > now) {
        const nm = k === "quyosh" ? "Quyosh" : (PRAYERS.filter(p => p[0] === k)[0] || ["", k])[1];
        return { key: k, name: nm, at: t[k], left: t[k] - now };
      }
    }
    const tm = H.namozTimes(H.shiftDay(H.today(), 1), cfg);
    return { key: "bomdod", name: "Bomdod", at: tm.bomdod, left: 1440 - now + (tm.bomdod || 0), tomorrow: true };
  };

  H.namozDayStat = function (iso) {
    const d = H.store.get(NS, DEF);
    const rec = d.log[iso || H.today()] || {};
    let done = 0, jamoat = 0;
    PRAYERS.forEach(([k]) => {
      if (rec[k] === "jamoat") { done++; jamoat++; }
      else if (rec[k] === "yakka") done++;
    });
    return { done, jamoat, total: 5, rec };
  };

  function mark(iso, key, state) {
    const d = H.store.get(NS, DEF);
    const rec = d.log[iso] = d.log[iso] || {};
    if (rec[key] === state) delete rec[key]; else rec[key] = state;
    if (!Object.keys(rec).length) delete d.log[iso];
    H.store.save(NS);
  }

  function streak() {
    const d = H.store.get(NS, DEF);
    let n = 0, cur = H.today();
    if (H.namozDayStat(cur).done < 5) cur = H.shiftDay(cur, -1);   // bugun hali tugamagan
    for (let i = 0; i < 400; i++) {
      if (H.namozDayStat(cur).done >= 5) { n++; cur = H.shiftDay(cur, -1); } else break;
    }
    return n;
  }

  function monthStat(key) {
    const days = H.monthDays(key).filter(x => x <= H.today());
    let done = 0, jamoat = 0, full = 0;
    days.forEach(iso => {
      const s = H.namozDayStat(iso);
      done += s.done; jamoat += s.jamoat;
      if (s.done >= 5) full++;
    });
    return { days: days.length, done, jamoat, full, total: days.length * 5 };
  }

  let viewMonth = null;

  H.mod({
    id: NS, title: "Namoz",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("change", onChange); },
    show(el) { render(el); }
  });

  function timeRow(t, k, label) {
    return '<div class="h-item"><span class="ttl">' + label + '</span>' +
      '<span class="num">' + (t[k] == null ? "—" : H.hm(t[k])) + '</span></div>';
  }

  function render(el) {
    const d = H.store.get(NS, DEF);
    const today = H.today();
    const t = H.namozTimes(today, d.cfg);
    const nx = H.namozNext();
    const st = H.namozDayStat(today);
    const mk = viewMonth || H.monthKey(today);
    const ms = monthStat(mk);
    const qazoTotal = PRAYERS.reduce((a, [k]) => a + (d.qazo[k] || 0), 0);

    let h = '<div class="h-card lift" data-m="namoz">' +
      '<div class="h-card-h"><h3>Bugungi namozlar</h3>' +
      '<span class="h-pill' + (st.done === 5 ? " ok" : "") + '">' + st.done + '/5</span></div>' +
      '<p class="h-note" style="margin:-4px 0 12px">' + H.fmtLong(today) + ' · ' + H.esc(d.cfg.city) +
      ' · keyingisi: <b>' + nx.name + '</b> ' + H.hm(nx.at) +
      ' (' + Math.floor(nx.left / 60) + ' soat ' + (nx.left % 60) + ' daqiqa qoldi)</p>' +
      '<div class="h-list">' +
      PRAYERS.map(([k, label]) => {
        const cur = st.rec[k];
        return '<div class="h-item">' +
          '<span class="ttl">' + label + '</span>' +
          '<span class="num">' + (t[k] == null ? "—" : H.hm(t[k])) + '</span>' +
          '<span class="h-row" style="gap:4px;flex-wrap:nowrap">' +
          STATES.map(([s, nm, cls]) =>
            '<button class="h-btn sm' + (cur === s ? " " + (cls === "warn" ? "bad" : (cls === "ok" ? "ok" : "pri")) : "") +
            '" data-mark="' + k + '" data-state="' + s + '"' +
            (cur === s ? ' aria-pressed="true"' : '') + '>' + nm + '</button>').join("") +
          '</span></div>';
      }).join("") + '</div>' +
      '<p class="h-note" style="margin-top:10px">Quyosh chiqishi: ' + (t.quyosh == null ? "—" : H.hm(t.quyosh)) +
      ' — bomdod vaqti shunda tugaydi.</p></div>';

    /* oy kalendari */
    h += '<div class="h-sec"><div class="h-sec-h"><span>Oylik daftar</span>' +
      '<span><button class="h-link" data-mon="-1">‹ oldingi</button> ' + mk +
      ' <button class="h-link" data-mon="1">keyingi ›</button></span></div>' +
      '<div class="n-cal">' + H.monthDays(mk).map(iso => {
        const future = iso > today;
        const s = H.namozDayStat(iso);
        return '<button class="n-day' + (iso === today ? " now" : "") + (future ? " future" : "") + '"' +
          (future ? " disabled" : "") + ' data-day="' + iso + '" title="' + H.fmtDate(iso) + ' — ' + s.done + '/5">' +
          '<b>' + H.date(iso).getDate() + '</b><span class="n-dots">' +
          PRAYERS.map(([k]) => '<i class="' + (s.rec[k] || "none") + '"></i>').join("") +
          '</span></button>';
      }).join("") + '</div>' +
      '<div class="h-stats" style="margin-top:14px">' +
      '<div class="h-stat"><b>' + (ms.total ? Math.round(ms.done / ms.total * 100) : 0) + '%</b><span>oʻqilgan</span></div>' +
      '<div class="h-stat"><b>' + ms.jamoat + '</b><span>jamoat bilan</span></div>' +
      '<div class="h-stat"><b>' + ms.full + '</b><span>toʻliq kun</span></div>' +
      '<div class="h-stat"><b>' + streak() + '</b><span>ketma-ket kun</span></div>' +
      '</div></div>';

    /* qazo daftari */
    h += '<div class="h-card" data-m="namoz"><div class="h-card-h"><h3>Qazo daftari</h3>' +
      '<span class="h-pill' + (qazoTotal ? " warn" : " ok") + '">' + qazoTotal + ' ta</span></div>' +
      '<p class="h-note" style="margin:-4px 0 10px">Oʻqilmay qolgan namozlar hisobi. Qazosini oʻqiganingizda «−» ni bosing.</p>' +
      '<div class="h-list">' + PRAYERS.map(([k, label]) =>
        '<div class="h-item"><span class="ttl">' + label + '</span>' +
        '<span class="num">' + (d.qazo[k] || 0) + '</span>' +
        '<span class="h-row" style="gap:4px;flex-wrap:nowrap">' +
        '<button class="h-btn sm" data-qazo="' + k + '" data-n="-1" aria-label="kamaytirish">−</button>' +
        '<button class="h-btn sm" data-qazo="' + k + '" data-n="1" aria-label="koʻpaytirish">+</button>' +
        '<button class="h-btn sm" data-qazo="' + k + '" data-n="10">+10</button></span></div>').join("") +
      '</div></div>';

    /* sozlamalar */
    const cfg = d.cfg;
    h += '<details class="h-card" data-m="namoz"' + (cfg._opened ? " open" : "") + '>' +
      '<summary style="cursor:pointer;font-weight:700">Vaqt sozlamalari</summary>' +
      '<div class="h-warn" style="margin-top:12px">Vaqtlar astronomik hisob bilan chiqariladi. ' +
      'Mahalliy taqvim bilan solishtiring — farq boʻlsa, quyida har namozga ± daqiqa tuzatish kiriting.</div>' +
      '<div class="h-form">' +
      '<div class="h-field wide"><label>Shahar</label><select class="h-in" data-cfg="city">' +
        CITIES.map(c => '<option' + (c[0] === cfg.city ? " selected" : "") + '>' + c[0] + '</option>').join("") +
        '<option' + (CITIES.every(c => c[0] !== cfg.city) ? " selected" : "") + ' value="__">Boshqa (koordinata)</option>' +
      '</select></div>' +
      '<div class="h-field"><label>Kenglik</label><input class="h-in" type="number" step="0.0001" data-cfg="lat" value="' + cfg.lat + '"></div>' +
      '<div class="h-field"><label>Uzunlik</label><input class="h-in" type="number" step="0.0001" data-cfg="lon" value="' + cfg.lon + '"></div>' +
      '<div class="h-field wide"><label>Hisob usuli</label><select class="h-in" data-cfg="method">' +
        Object.keys(METHODS).map(k => '<option value="' + k + '"' + (k === cfg.method ? " selected" : "") + '>' +
          METHODS[k].name + '</option>').join("") + '</select></div>' +
      '<div class="h-field wide"><label>Asr hisobi</label><select class="h-in" data-cfg="asr">' +
        '<option value="hanafiy"' + (cfg.asr === "hanafiy" ? " selected" : "") + '>Hanafiy (soya 2 baravar)</option>' +
        '<option value="shofeiy"' + (cfg.asr === "shofeiy" ? " selected" : "") + '>Shofeiy (soya 1 baravar)</option>' +
      '</select></div>' +
      '</div>' +
      '<p class="h-note" style="margin:14px 0 6px">Tuzatish (daqiqa):</p><div class="h-form">' +
      [["bomdod", "Bomdod"], ["quyosh", "Quyosh"], ["peshin", "Peshin"], ["asr", "Asr"], ["shom", "Shom"], ["xufton", "Xufton"]]
        .map(([k, nm]) => '<div class="h-field"><label>' + nm + '</label>' +
          '<input class="h-in" type="number" step="1" data-adj="' + k + '" value="' + (cfg.adj[k] || 0) + '"></div>').join("") +
      '</div>' +
      '<div class="h-row" style="margin-top:12px"><button class="h-btn sm" data-act="geo">Joylashuvni aniqlash</button></div>' +
      '</details>';

    el.innerHTML = h;
  }

  function onClick(e) {
    const el = e.currentTarget;
    const m = e.target.closest("[data-mark]");
    if (m) { mark(H.today(), m.dataset.mark, m.dataset.state); render(el); H.emit("today"); return; }
    const q = e.target.closest("[data-qazo]");
    if (q) {
      const d = H.store.get(NS, DEF), k = q.dataset.qazo;
      d.qazo[k] = Math.max(0, (d.qazo[k] || 0) + (+q.dataset.n));
      H.store.save(NS); render(el); return;
    }
    const mo = e.target.closest("[data-mon]");
    if (mo) {
      const cur = viewMonth || H.monthKey(H.today());
      const [y, mm] = cur.split("-").map(Number);
      const d2 = new Date(y, mm - 1 + (+mo.dataset.mon), 1);
      viewMonth = d2.getFullYear() + "-" + H.pad(d2.getMonth() + 1);
      render(el); return;
    }
    const dy = e.target.closest("[data-day]");
    if (dy) { openDay(el, dy.dataset.day); return; }
    const a = e.target.closest("[data-act]");
    if (a && a.dataset.act === "geo") {
      if (!navigator.geolocation) { alert("Bu brauzer joylashuvni aniqlay olmaydi."); return; }
      navigator.geolocation.getCurrentPosition(pos => {
        const d = H.store.get(NS, DEF);
        d.cfg.lat = +pos.coords.latitude.toFixed(4);
        d.cfg.lon = +pos.coords.longitude.toFixed(4);
        d.cfg.city = "Joriy joylashuv";
        d.cfg._opened = true;
        H.store.save(NS); render(el);
      }, () => alert("Joylashuvni aniqlab boʻlmadi — ruxsat berilmagan boʻlishi mumkin."));
    }
  }

  function onChange(e) {
    const el = e.currentTarget;
    const d = H.store.get(NS, DEF);
    const c = e.target.closest("[data-cfg]");
    if (c) {
      const k = c.dataset.cfg;
      if (k === "city") {
        const city = CITIES.filter(x => x[0] === c.value)[0];
        if (city) { d.cfg.city = city[0]; d.cfg.lat = city[1]; d.cfg.lon = city[2]; }
        else d.cfg.city = "Boshqa";
      } else if (k === "lat" || k === "lon") d.cfg[k] = +c.value || 0;
      else d.cfg[k] = c.value;
      d.cfg._opened = true;
      H.store.save(NS); render(el); H.emit("today"); return;
    }
    const a = e.target.closest("[data-adj]");
    if (a) {
      d.cfg.adj[a.dataset.adj] = Math.round(+a.value || 0);
      d.cfg._opened = true;
      H.store.save(NS); render(el); H.emit("today");
    }
  }

  /* oʻtgan kunni toʻldirish */
  function openDay(el, iso) {
    const d = H.store.get(NS, DEF);
    const rec = d.log[iso] || {};
    const box = document.createElement("div");
    box.className = "n-sheet";
    box.innerHTML = '<div class="n-sheet-in"><div class="h-card-h"><h3>' + H.fmtLong(iso) + '</h3>' +
      '<button class="h-link" data-close="1">yopish</button></div><div class="h-list">' +
      PRAYERS.map(([k, label]) => '<div class="h-item"><span class="ttl">' + label + '</span>' +
        '<span class="h-row" style="gap:4px;flex-wrap:nowrap">' +
        STATES.map(([s, nm, cls]) => '<button class="h-btn sm' +
          (rec[k] === s ? " " + (cls === "warn" ? "bad" : (cls === "ok" ? "ok" : "pri")) : "") +
          '" data-dmark="' + k + '" data-state="' + s + '">' + nm + '</button>').join("") +
        '</span></div>').join("") + '</div></div>';
    box.addEventListener("click", ev => {
      if (ev.target === box || ev.target.closest("[data-close]")) { box.remove(); render(el); return; }
      const b = ev.target.closest("[data-dmark]");
      if (b) { mark(iso, b.dataset.dmark, b.dataset.state); box.remove(); openDay(el, iso); }
    });
    document.body.appendChild(box);
  }
})(window.H);
