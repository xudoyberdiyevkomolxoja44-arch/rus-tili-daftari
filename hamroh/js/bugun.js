/* ============ Бугун ============
   Барча бўлимларнинг бугунги ҳолати бир саҳифада. */
(function (H) {
  H.dayScore = function () {
    const parts = [];
    const n = H.namozDayStat();
    parts.push({ k: "namoz", v: n.done / 5 });
    const o = H.oilaToday();
    if (o.total) parts.push({ k: "oila", v: o.done / o.total });
    const i = H.ishToday();
    const wd = (i.cfg.workdays || []).indexOf(new Date().getDay()) >= 0;
    if (wd) parts.push({ k: "ish", v: i.rec.in != null ? 1 : 0 });
    const s = H.sportWeek();
    parts.push({ k: "sport", v: Math.min(1, s.goal ? s.count / s.goal : 0) });
    const r = H.rusSummary();
    if (r.started) parts.push({ k: "rus", v: Math.min(1, r.goal ? r.done / r.goal : 0) });
    const v = parts.reduce((a, p) => a + p.v, 0) / (parts.length || 1);
    return { pct: v, parts };
  };

  H.mod({
    id: "bugun", title: "Бугун",
    init(el) { el.addEventListener("click", onClick); },
    show(el) { render(el); }
  });

  function render(el) {
    const today = H.today();
    const n = H.namozDayStat(), nx = H.namozNext();
    const i = H.ishToday(), tk = H.ishTasks();
    const s = H.sportWeek(), st = H.sportToday();
    const o = H.oilaToday(), up = H.oilaUpcoming(2).filter(u => u.days <= 30);
    const r = H.rusSummary();
    const sc = H.dayScore();

    let h = '<div class="b-hero">' +
      '<div><h2 class="h-h2">' + H.fmtLong(today) + '</h2>' +
      '<p class="h-note">Кун натижаси: ' + Math.round(sc.pct * 100) + '%' +
      ' · кейинги намоз: <b>' + nx.name + '</b> ' + H.hm(nx.at) + '</p></div>' +
      '<div class="b-ring">' + H.ring(sc.pct, 56) + '<span>' + Math.round(sc.pct * 100) + '%</span></div></div>';

    /* Намоз */
    h += '<div class="h-card" data-m="namoz"><div class="h-card-h"><h3>Намоз</h3>' +
      '<button class="h-link" data-go="namoz">батафсил →</button></div>' +
      '<div class="b-pray">' + [["bomdod", "Бомдод"], ["peshin", "Пешин"], ["asr", "Аср"], ["shom", "Шом"], ["xufton", "Хуфтон"]]
        .map(([k, nm]) => {
          const v = n.rec[k];
          return '<div class="b-pr' + (v ? " s-" + v : "") + '"><b>' + nm + '</b>' +
            '<span>' + (v === "jamoat" ? "жамоат" : v === "yakka" ? "якка" : v === "qazo" ? "қазо" : "—") + '</span></div>';
        }).join("") + '</div>' +
      '<p class="h-note" style="margin-top:10px">' + n.done + '/5 ўқилди' +
      (n.jamoat ? ' · ' + n.jamoat + ' таси жамоат билан' : '') + '</p></div>';

    /* Иш */
    h += '<div class="h-card" data-m="ish"><div class="h-card-h"><h3>Иш</h3>' +
      '<button class="h-link" data-go="ish">батафсил →</button></div>' +
      '<div class="h-row" style="justify-content:space-between">' +
      '<div class="h-stats">' +
      '<div class="h-stat"><b>' + (i.rec.in != null ? H.hm(i.rec.in) : "—") + '</b><span>келдим</span></div>' +
      '<div class="h-stat"><b>' + (i.rec.out != null ? H.hm(i.rec.out) : "—") + '</b><span>кетдим</span></div>' +
      '<div class="h-stat"><b>' + H.hm(i.mins) + '</b><span>иш вақти</span></div></div>' +
      (i.rec.in == null ? '<button class="h-btn pri" data-act="in">Ишга келдим</button>'
        : (i.rec.out == null ? '<button class="h-btn" data-act="out">Ишдан кетдим</button>' : '')) +
      '</div>' +
      (tk.open.length ? '<p class="h-note" style="margin-top:10px">Бажарилмаган вазифа: ' + tk.open.length +
        (tk.late.length ? ' · <b style="color:var(--red)">муддати ўтган: ' + tk.late.length + '</b>' : '') + '</p>' : '') +
      '</div>';

    /* Оила */
    if (o.total) {
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Оила</h3>' +
        '<button class="h-link" data-go="oila">батафсил →</button></div><div class="h-list">' +
        o.list.slice(0, 5).map(a => {
          const done = (H.store.get("oila").log[a.freq === "kun" ? H.today() : (a.freq === "hafta" ? H.weekKey(H.today()) : H.monthKey(H.today()))] || {})[a.id];
          return '<div class="h-item"><button class="h-check" data-oila="' + a.id + '" aria-pressed="' + !!done + '">' +
            (done ? "✓" : "") + '</button><span class="ttl">' + H.esc(a.title) + '</span></div>';
        }).join("") + '</div></div>';
    } else {
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Оила</h3>' +
        '<button class="h-link" data-go="oila">очиш →</button></div>' +
        '<p class="h-note">Оила аъзоларини ва кунлик аҳдларни киритсангиз, шу ерда чиқади.</p></div>';
    }

    /* Спорт */
    h += '<div class="h-card" data-m="sport"><div class="h-card-h"><h3>Спорт</h3>' +
      '<button class="h-link" data-go="sport">батафсил →</button></div>' +
      H.bar(s.count, s.goal, s.count >= s.goal) +
      '<p class="h-note" style="margin-top:8px">Шу ҳафта ' + s.count + '/' + s.goal + ' машғулот · ' + s.minutes + ' дақиқа' +
      (st.length ? ' · бугун: ' + H.esc(st.map(x => x.type).join(", ")) : ' · бугун ҳали йўқ') + '</p></div>';

    /* Рус тили */
    h += '<div class="h-card" data-m="rus"><div class="h-card-h"><h3>Рус тили</h3>' +
      '<button class="h-link" data-go="rus">бўлимга →</button></div>' +
      '<p class="h-note">Режа бўйича <b>' + r.day + '-кун</b>' +
      (r.due ? ' · такрорга тайёр: <b>' + r.due + '</b> сўз' : ' · такрор қарздорлиги йўқ') +
      ' · бугун ' + r.done + '/' + r.goal + ' машқ</p></div>';

    /* Яқин саналар */
    if (up.length) h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Яқин саналар</h3></div><div class="h-list">' +
      up.map(u => '<div class="h-item"><span class="ttl">' + H.esc(u.title) + '</span><span class="num">' +
        (u.days === 0 ? "бугун!" : u.days + " кун") + '</span></div>').join("") + '</div></div>';

    el.innerHTML = h;
  }

  function onClick(e) {
    const el = e.currentTarget;
    const g = e.target.closest("[data-go]");
    if (g) { H.go(g.dataset.go); return; }
    const a = e.target.closest("[data-act]");
    if (a) {
      const d = H.store.get("ish");
      const rec = d.days[H.today()] = d.days[H.today()] || {};
      if (a.dataset.act === "in") rec.in = H.nowMin(); else rec.out = H.nowMin();
      H.store.save("ish"); render(el); H.emit("today"); return;
    }
    const o = e.target.closest("[data-oila]");
    if (o) {
      const d = H.store.get("oila");
      const ahd = d.ahds.filter(x => x.id === o.dataset.oila)[0];
      if (!ahd) return;
      const k = ahd.freq === "kun" ? H.today() : (ahd.freq === "hafta" ? H.weekKey(H.today()) : H.monthKey(H.today()));
      const rec = d.log[k] = d.log[k] || {};
      if (rec[ahd.id]) delete rec[ahd.id]; else rec[ahd.id] = true;
      H.store.save("oila"); render(el); H.emit("today");
    }
  }
})(window.H);
