/* ============ Bugun ============
   Barcha boʻlimlarning bugungi holati bir sahifada. */
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
    const r = H.tilSummary();
    if (r.started) parts.push({ k: "til", v: Math.min(1, r.goal ? r.done / r.goal : 0) });
    const v = parts.reduce((a, p) => a + p.v, 0) / (parts.length || 1);
    return { pct: v, parts };
  };

  H.mod({
    id: "bugun", title: "Bugun",
    init(el) { el.addEventListener("click", onClick); },
    show(el) { render(el); }
  });

  function render(el) {
    const today = H.today();
    const n = H.namozDayStat(), nx = H.namozNext();
    const i = H.ishToday(), tk = H.ishTasks();
    const s = H.sportWeek(), st = H.sportToday();
    const o = H.oilaToday(), up = H.oilaUpcoming(2).filter(u => u.days <= 30);
    const r = H.tilSummary();
    const sc = H.dayScore();

    let h = '<div class="b-hero">' +
      '<div><h2 class="h-h2">' + H.fmtLong(today) + '</h2>' +
      '<p class="h-note">Kun natijasi: ' + Math.round(sc.pct * 100) + '%' +
      ' · keyingi namoz: <b>' + nx.name + '</b> ' + H.hm(nx.at) + '</p></div>' +
      '<div class="b-ring">' + H.ring(sc.pct, 56) + '<span>' + Math.round(sc.pct * 100) + '%</span></div></div>';

    /* Namoz */
    h += '<div class="h-card" data-m="namoz"><div class="h-card-h"><h3>Namoz</h3>' +
      '<button class="h-link" data-go="namoz">batafsil →</button></div>' +
      '<div class="b-pray">' + [["bomdod", "Bomdod"], ["peshin", "Peshin"], ["asr", "Asr"], ["shom", "Shom"], ["xufton", "Xufton"]]
        .map(([k, nm]) => {
          const v = n.rec[k];
          return '<div class="b-pr' + (v ? " s-" + v : "") + '"><b>' + nm + '</b>' +
            '<span>' + (v === "jamoat" ? "jamoat" : v === "yakka" ? "yakka" : v === "qazo" ? "qazo" : "—") + '</span></div>';
        }).join("") + '</div>' +
      '<p class="h-note" style="margin-top:10px">' + n.done + '/5 oʻqildi' +
      (n.jamoat ? ' · ' + n.jamoat + ' tasi jamoat bilan' : '') + '</p></div>';

    /* Ish */
    h += '<div class="h-card" data-m="ish"><div class="h-card-h"><h3>Ish</h3>' +
      '<button class="h-link" data-go="ish">batafsil →</button></div>' +
      '<div class="h-row" style="justify-content:space-between">' +
      '<div class="h-stats">' +
      '<div class="h-stat"><b>' + (i.rec.in != null ? H.hm(i.rec.in) : "—") + '</b><span>keldim</span></div>' +
      '<div class="h-stat"><b>' + (i.rec.out != null ? H.hm(i.rec.out) : "—") + '</b><span>ketdim</span></div>' +
      '<div class="h-stat"><b>' + H.hm(i.mins) + '</b><span>ish vaqti</span></div></div>' +
      (i.rec.in == null ? '<button class="h-btn pri" data-act="in">Ishga keldim</button>'
        : (i.rec.out == null ? '<button class="h-btn" data-act="out">Ishdan ketdim</button>' : '')) +
      '</div>' +
      (tk.open.length ? '<p class="h-note" style="margin-top:10px">Bajarilmagan vazifa: ' + tk.open.length +
        (tk.late.length ? ' · <b style="color:var(--red)">muddati oʻtgan: ' + tk.late.length + '</b>' : '') + '</p>' : '') +
      '</div>';

    /* Oila */
    if (o.total) {
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Oila</h3>' +
        '<button class="h-link" data-go="oila">batafsil →</button></div><div class="h-list">' +
        o.list.slice(0, 5).map(a => {
          const done = (H.store.get("oila").log[a.freq === "kun" ? H.today() : (a.freq === "hafta" ? H.weekKey(H.today()) : H.monthKey(H.today()))] || {})[a.id];
          return '<div class="h-item"><button class="h-check" data-oila="' + a.id + '" aria-pressed="' + !!done + '">' +
            (done ? "✓" : "") + '</button><span class="ttl">' + H.esc(a.title) + '</span></div>';
        }).join("") + '</div></div>';
    } else {
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Oila</h3>' +
        '<button class="h-link" data-go="oila">ochish →</button></div>' +
        '<p class="h-note">Oila aʼzolarini va kunlik ahdlarni kiritsangiz, shu yerda chiqadi.</p></div>';
    }

    /* Sport */
    h += '<div class="h-card" data-m="sport"><div class="h-card-h"><h3>Sport</h3>' +
      '<button class="h-link" data-go="sport">batafsil →</button></div>' +
      H.bar(s.count, s.goal, s.count >= s.goal) +
      '<p class="h-note" style="margin-top:8px">Shu hafta ' + s.count + '/' + s.goal + ' mashgʻulot · ' + s.minutes + ' daqiqa' +
      (st.length ? ' · bugun: ' + H.esc(st.map(x => x.type).join(", ")) : ' · bugun hali yoʻq') + '</p></div>';

    /* Til oʻrganish */
    h += '<div class="h-card" data-m="til"><div class="h-card-h"><h3>Til oʻrganish</h3>' +
      '<button class="h-link" data-go="til">boʻlimga →</button></div>' +
      (r.started
        ? '<p class="h-note">' + H.esc(r.name) + ' · reja boʻyicha <b>' + r.day + '-kun</b>' +
          (r.due ? ' · takrorga tayyor: <b>' + r.due + '</b> soʻz' : ' · takror qarzdorligi yoʻq') +
          ' · bugun ' + r.done + '/' + r.goal + ' mashq · oʻrganilgan ' + r.known + '/' + r.total + '</p>'
        : '<p class="h-note">Sakkizta til: rus, ingliz, qozoq, nemis, yapon, xitoy, koreys, arab. Birini tanlab boshlang.</p>') +
      '</div>';

    /* Yaqin sanalar */
    if (up.length) h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Yaqin sanalar</h3></div><div class="h-list">' +
      up.map(u => '<div class="h-item"><span class="ttl">' + H.esc(u.title) + '</span><span class="num">' +
        (u.days === 0 ? "bugun!" : u.days + " kun") + '</span></div>').join("") + '</div></div>';

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
