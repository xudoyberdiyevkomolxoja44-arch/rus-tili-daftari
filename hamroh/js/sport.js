/* ============ Sport ============
   Mashgʻulotlar kundaligi, haftalik maqsad, vazn jurnali. */
(function (H) {
  const NS = "sport";
  const TYPES = ["Ertalabki mashq", "Yugurish", "Piyoda yurish", "Sportzal", "Turnik",
                 "Velosiped", "Suzish", "Futbol", "Boshqa"];
  const DEF = { sessions: [], weight: [], cfg: { weekGoal: 3, lastType: "Ertalabki mashq", lastMin: 30 } };

  H.store.get(NS, DEF);          /* boshlangʻich qiymatni darhol roʻyxatdan oʻtkazamiz */
  const data = () => H.store.get(NS, DEF);
  const inWeek = (iso, wk) => H.weekKey(iso) === wk;

  H.sportWeek = function () {
    const d = data(), wk = H.weekKey(H.today());
    const list = d.sessions.filter(s => inWeek(s.date, wk));
    return { list, count: list.length, goal: d.cfg.weekGoal, minutes: list.reduce((a, s) => a + (+s.minutes || 0), 0) };
  };
  H.sportToday = () => data().sessions.filter(s => s.date === H.today());

  function weekStreak() {
    const d = data();
    let n = 0, wk = H.weekKey(H.today());
    const count = k => d.sessions.filter(s => inWeek(s.date, k)).length;
    if (count(wk) < d.cfg.weekGoal) wk = H.shiftDay(wk, -7);
    for (let i = 0; i < 200; i++) {
      if (count(wk) >= d.cfg.weekGoal) { n++; wk = H.shiftDay(wk, -7); } else break;
    }
    return n;
  }

  let tab = "bugun";

  H.mod({
    id: NS, title: "Sport",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); },
    show(el) { render(el); }
  });

  function render(el) {
    const d = data(), w = H.sportWeek(), today = H.today();
    let h = '<div class="h-seg" style="margin-bottom:16px">' +
      [["bugun", "Mashgʻulot"], ["tarix", "Tarix"], ["vazn", "Vazn"]]
        .map(([k, nm]) => '<button data-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + nm + '</button>').join("") +
      '</div>';

    if (tab === "bugun") {
      const todayList = H.sportToday();
      h += '<div class="h-card lift" data-m="sport"><div class="h-card-h"><h3>Shu hafta</h3>' +
        '<span class="h-pill' + (w.count >= w.goal ? " ok" : "") + '">' + w.count + '/' + w.goal + '</span></div>' +
        H.bar(w.count, w.goal, w.count >= w.goal) +
        '<div class="h-stats" style="margin-top:14px">' +
        '<div class="h-stat"><b>' + w.minutes + '</b><span>daqiqa</span></div>' +
        '<div class="h-stat"><b>' + weekStreak() + '</b><span>ketma-ket hafta</span></div>' +
        '<div class="h-stat"><b>' + d.sessions.length + '</b><span>jami mashgʻulot</span></div></div></div>';

      h += '<div class="h-card" data-m="sport"><div class="h-card-h"><h3>Mashgʻulot yozish</h3></div>' +
        '<form data-form="s" class="h-form">' +
        '<div class="h-field"><label>Sana</label><input class="h-in" type="date" name="date" value="' + today + '"></div>' +
        '<div class="h-field"><label>Turi</label><select class="h-in" name="type">' +
        TYPES.map(t => '<option' + (t === d.cfg.lastType ? " selected" : "") + '>' + t + '</option>').join("") + '</select></div>' +
        '<div class="h-field"><label>Davomiyligi (daqiqa)</label><input class="h-in" type="number" name="minutes" min="1" max="600" value="' + d.cfg.lastMin + '"></div>' +
        '<div class="h-field"><label>Izoh</label><input class="h-in" name="note" placeholder="5 km, 40 ta turnik…"></div>' +
        '<div class="h-field wide"><button class="h-btn pri">Qoʻshish</button></div></form></div>';

      if (todayList.length) h += '<div class="h-card" data-m="sport"><div class="h-card-h"><h3>Bugun</h3></div><div class="h-list">' +
        todayList.map(row).join("") + '</div></div>';

      h += '<div class="h-card" data-m="sport"><div class="h-card-h"><h3>Haftalik maqsad</h3></div>' +
        '<div class="h-row">' + [2, 3, 4, 5, 6, 7].map(n =>
          '<button class="h-btn sm' + (d.cfg.weekGoal === n ? " pri" : "") + '" data-goal="' + n + '">' + n + '</button>').join("") +
        '<span class="h-note">haftasiga necha marta</span></div></div>';
    }

    if (tab === "tarix") {
      const mk = H.monthKey(today);
      const month = d.sessions.filter(s => s.date.slice(0, 7) === mk);
      const byType = {};
      month.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1; });
      h += '<div class="h-stats" style="margin-bottom:18px">' +
        '<div class="h-stat"><b>' + month.length + '</b><span>shu oyda</span></div>' +
        '<div class="h-stat"><b>' + month.reduce((a, s) => a + (+s.minutes || 0), 0) + '</b><span>daqiqa</span></div>' +
        '<div class="h-stat"><b>' + Object.keys(byType).length + '</b><span>xil mashgʻulot</span></div></div>';
      const list = d.sessions.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 60);
      h += list.length ? '<div class="h-card" data-m="sport"><div class="h-list">' + list.map(row).join("") + '</div></div>'
        : '<div class="h-empty">Hali mashgʻulot yozilmagan.</div>';
    }

    if (tab === "vazn") {
      const ws = d.weight.slice().sort((a, b) => a.date < b.date ? -1 : 1);
      const last = ws[ws.length - 1];
      const first = ws[0];
      h += '<div class="h-card" data-m="sport"><div class="h-card-h"><h3>Vazn</h3>' +
        (last ? '<span class="h-pill">' + last.kg + ' kg</span>' : '') + '</div>' +
        (ws.length > 1 ? H.spark(ws.map(x => +x.kg)) : '') +
        (ws.length > 1 ? '<p class="h-note">' + first.kg + ' kg (' + H.fmtDate(first.date) + ') → ' +
          last.kg + ' kg (' + H.fmtDate(last.date) + ') · farq ' +
          ((last.kg - first.kg) > 0 ? "+" : "") + (last.kg - first.kg).toFixed(1) + ' kg</p>' : '') +
        '<form data-form="w" class="h-form" style="margin-top:12px">' +
        '<div class="h-field"><label>Sana</label><input class="h-in" type="date" name="date" value="' + today + '"></div>' +
        '<div class="h-field"><label>Vazn (kg)</label><input class="h-in" type="number" step="0.1" name="kg" required></div>' +
        '<div class="h-field"><button class="h-btn pri" style="margin-top:18px">Yozish</button></div></form></div>';
      if (ws.length) h += '<div class="h-card" data-m="sport"><div class="h-list">' +
        ws.slice().reverse().slice(0, 30).map(x => '<div class="h-item"><span class="ttl">' + H.fmtDate(x.date) + '</span>' +
          '<span class="num">' + x.kg + ' kg</span>' +
          '<button class="h-link" data-delw="' + x.date + '">oʻchirish</button></div>').join("") + '</div></div>';
    }

    el.innerHTML = h;
  }

  function row(s) {
    return '<div class="h-item"><span class="ttl">' + H.esc(s.type) +
      '<span class="sub">' + H.fmtDate(s.date) + (s.note ? " · " + H.esc(s.note) : "") + '</span></span>' +
      '<span class="num">' + s.minutes + ' daq.</span>' +
      '<button class="h-link" data-del="' + s.id + '">oʻchirish</button></div>';
  }

  function onClick(e) {
    const el = e.currentTarget, d = data();
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; render(el); return; }
    const g = e.target.closest("[data-goal]");
    if (g) { d.cfg.weekGoal = +g.dataset.goal; H.store.save(NS); render(el); H.emit("today"); return; }
    const dl = e.target.closest("[data-del]");
    if (dl) { d.sessions = d.sessions.filter(s => s.id !== dl.dataset.del); H.store.save(NS); render(el); H.emit("today"); return; }
    const dw = e.target.closest("[data-delw]");
    if (dw) { d.weight = d.weight.filter(x => x.date !== dw.dataset.delw); H.store.save(NS); render(el); }
  }

  function onSubmit(e) {
    e.preventDefault();
    const el = e.currentTarget, d = data(), f = e.target;
    const val = n => (f.elements[n] ? String(f.elements[n].value).trim() : "");
    if (f.dataset.form === "s") {
      const mins = +val("minutes") || 0;
      if (!mins) return;
      d.sessions.push({ id: H.id(), date: val("date") || H.today(), type: val("type"), minutes: mins, note: val("note") });
      d.cfg.lastType = val("type"); d.cfg.lastMin = mins;
      H.store.save(NS); render(el); H.emit("today"); return;
    }
    if (f.dataset.form === "w") {
      const kg = +val("kg");
      if (!kg) return;
      const date = val("date") || H.today();
      d.weight = d.weight.filter(x => x.date !== date);
      d.weight.push({ date, kg: Math.round(kg * 10) / 10 });
      H.store.save(NS); render(el);
    }
  }
})(window.H);
