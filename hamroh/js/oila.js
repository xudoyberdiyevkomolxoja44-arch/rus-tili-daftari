/* ============ Оила ============
   Оила аъзолари, уларга берилган аҳдлар (кунлик/ҳафталик/ойлик),
   сўнгги алоқа санаси, муҳим саналар ва ҳафталик ўз-ўзини баҳолаш. */
(function (H) {
  const NS = "oila";
  const DEF = { members: [], ahds: [], log: {}, week: {}, events: [] };
  const RELS = ["ота", "она", "турмуш ўртоғи", "ўғил", "қиз", "ака", "ука", "опа", "сингил",
                "бобо", "буви", "қайнота", "қайнона", "набира", "қариндош", "бошқа"];
  const FREQ = { kun: "ҳар куни", hafta: "ҳафтада бир", oy: "ойда бир" };

  H.store.get(NS, DEF);          /* бошланғич қийматни дарҳол рўйхатдан ўтказамиз */
  const data = () => H.store.get(NS, DEF);
  const periodKey = freq => freq === "kun" ? H.today() : (freq === "hafta" ? H.weekKey(H.today()) : H.monthKey(H.today()));
  const isDone = a => !!(data().log[periodKey(a.freq)] || {})[a.id];
  const member = id => data().members.filter(m => m.id === id)[0];

  function toggle(a) {
    const d = data(), k = periodKey(a.freq);
    const rec = d.log[k] = d.log[k] || {};
    if (rec[a.id]) delete rec[a.id]; else rec[a.id] = true;
    if (!Object.keys(rec).length) delete d.log[k];
    H.store.save(NS);
  }

  /* туғилган кунлар ва муҳим саналар — яқинлари */
  function upcoming(limit) {
    const d = data(), today = H.date(), out = [];
    const push = (title, dateStr, kind) => {
      if (!dateStr) return;
      const p = dateStr.split("-");
      if (p.length < 3) return;
      let next = new Date(today.getFullYear(), +p[1] - 1, +p[2]);
      if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) next.setFullYear(today.getFullYear() + 1);
      out.push({ title, kind, days: H.dayDiff(H.iso(today), H.iso(next)), iso: H.iso(next), year: +p[0] });
    };
    d.members.forEach(m => push(m.name + " — туғилган куни", m.birth, "tug"));
    d.events.forEach(e => push(e.title, e.date, "sana"));
    out.sort((a, b) => a.days - b.days);
    return limit ? out.slice(0, limit) : out;
  }
  H.oilaUpcoming = upcoming;

  H.oilaToday = function () {
    const d = data();
    const list = d.ahds.filter(a => a.freq === "kun" || !isDone(a));
    const done = list.filter(isDone).length;
    return { list, done, total: list.length };
  };

  let tab = "bugun", editing = null;

  H.mod({
    id: NS, title: "Оила",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); },
    show(el) { render(el); }
  });

  function monthPct() {
    const d = data(), mk = H.monthKey(H.today());
    const daily = d.ahds.filter(a => a.freq === "kun");
    if (!daily.length) return null;
    const days = H.monthDays(mk).filter(x => x <= H.today());
    let hit = 0;
    days.forEach(iso => { const rec = d.log[iso] || {}; daily.forEach(a => { if (rec[a.id]) hit++; }); });
    return Math.round(hit / (days.length * daily.length) * 100);
  }

  function render(el) {
    const d = data();
    const wk = H.weekKey(H.today());
    const w = d.week[wk] || {};
    let h = '<div class="h-seg" style="margin-bottom:16px">' +
      [["bugun", "Бугун"], ["azo", "Аъзолар"], ["ahd", "Аҳдлар"], ["sana", "Саналар"]]
        .map(([k, nm]) => '<button data-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + nm + '</button>').join("") +
      '</div>';

    if (tab === "bugun") {
      const t = H.oilaToday();
      const pct = monthPct();
      h += '<div class="h-card lift" data-m="oila"><div class="h-card-h"><h3>Бугунги аҳдлар</h3>' +
        '<span class="h-pill' + (t.total && t.done === t.total ? " ok" : "") + '">' + t.done + '/' + t.total + '</span></div>';
      h += t.list.length ? '<div class="h-list">' + t.list.map(a => {
        const m = member(a.memberId);
        return '<div class="h-item">' +
          '<button class="h-check" data-ahd="' + a.id + '" aria-pressed="' + isDone(a) + '">' + (isDone(a) ? "✓" : "") + '</button>' +
          '<span class="ttl">' + H.esc(a.title) + (m ? ' <span class="sub">— ' + H.esc(m.name) + '</span>' : '') + '</span>' +
          '<span class="num">' + FREQ[a.freq] + '</span></div>';
      }).join("") + '</div>'
        : '<div class="h-empty">Ҳали аҳд киритилмаган. «Аҳдлар» бўлимидан қўшинг — масалан «Ота-онамга қўнғироқ қилиш».</div>';
      h += '</div>';

      /* сўнгги алоқа */
      if (d.members.length) {
        h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Сўнгги алоқа</h3></div><div class="h-list">' +
          d.members.slice().sort((a, b) => (a.last || "") < (b.last || "") ? -1 : 1).map(m => {
            const dd = m.last ? H.dayDiff(m.last, H.today()) : null;
            const warn = dd === null || dd > 7;
            return '<div class="h-item"><span class="ttl">' + H.esc(m.name) +
              ' <span class="sub">' + H.esc(m.rel || "") + '</span></span>' +
              '<span class="h-pill' + (warn ? " warn" : " ok") + '">' +
              (dd === null ? "ёзилмаган" : (dd === 0 ? "бугун" : dd + " кун олдин")) + '</span>' +
              '<button class="h-btn sm" data-touch="' + m.id + '">Бугун гаплашдим</button></div>';
          }).join("") + '</div></div>';
      }

      /* ҳафталик баҳо */
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Шу ҳафта оилада ўзимни қандай тутдим?</h3></div>' +
        '<div class="h-row" style="margin-bottom:10px">' +
        [1, 2, 3, 4, 5].map(n => '<button class="h-btn sm' + (w.score === n ? " pri" : "") +
          '" data-score="' + n + '">' + n + '</button>').join("") +
        '<span class="h-note">1 — ёмон, 5 — жуда яхши</span></div>' +
        '<form data-form="week"><textarea class="h-in" name="note" rows="2" placeholder="Нима яхши бўлди, нимани тузатиш керак?">' +
        H.esc(w.note || "") + '</textarea>' +
        '<div class="h-row end" style="margin-top:8px"><button class="h-btn sm">Сақлаш</button></div></form></div>';

      if (pct !== null) h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Шу ой</h3>' +
        '<span class="h-pill">' + pct + '%</span></div>' + H.bar(pct, 100, pct >= 80) +
        '<p class="h-note" style="margin-top:8px">Кунлик аҳдларнинг бажарилиш улуши.</p></div>';

      const up = upcoming(3);
      if (up.length) h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Яқин саналар</h3></div><div class="h-list">' +
        up.map(u => '<div class="h-item"><span class="ttl">' + H.esc(u.title) + '</span>' +
          '<span class="num">' + (u.days === 0 ? "бугун!" : u.days + " кундан сўнг") + '</span></div>').join("") +
        '</div></div>';
    }

    if (tab === "azo") {
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>' +
        (editing && editing.t === "azo" ? "Аъзони таҳрирлаш" : "Янги аъзо") + '</h3></div>' + memberForm() + '</div>';
      h += d.members.length ? '<div class="h-card" data-m="oila"><div class="h-list">' + d.members.map(m =>
        '<div class="h-item"><span class="ttl">' + H.esc(m.name) +
        '<span class="sub">' + H.esc(m.rel || "") + (m.birth ? " · " + H.fmtDate(m.birth) : "") +
        (m.phone ? " · " + H.esc(m.phone) : "") + '</span></span>' +
        '<button class="h-link" data-edit-azo="' + m.id + '">таҳрир</button>' +
        '<button class="h-link" data-del-azo="' + m.id + '">ўчириш</button></div>').join("") + '</div></div>'
        : '<div class="h-empty">Аъзолар рўйхати бўш.</div>';
    }

    if (tab === "ahd") {
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Янги аҳд</h3></div>' +
        '<form data-form="ahd" class="h-form">' +
        '<div class="h-field wide"><label>Нима қиламан</label>' +
        '<input class="h-in" name="title" required placeholder="Масалан: онамга қўнғироқ қилиш"></div>' +
        '<div class="h-field"><label>Кимга тегишли</label><select class="h-in" name="memberId">' +
        '<option value="">— умумий —</option>' +
        d.members.map(m => '<option value="' + m.id + '">' + H.esc(m.name) + '</option>').join("") + '</select></div>' +
        '<div class="h-field"><label>Қанча тез-тез</label><select class="h-in" name="freq">' +
        Object.keys(FREQ).map(k => '<option value="' + k + '">' + FREQ[k] + '</option>').join("") + '</select></div>' +
        '<div class="h-field wide"><button class="h-btn pri">Қўшиш</button></div></form></div>';
      h += d.ahds.length ? '<div class="h-card" data-m="oila"><div class="h-list">' + d.ahds.map(a => {
        const m = member(a.memberId);
        return '<div class="h-item"><span class="ttl">' + H.esc(a.title) +
          '<span class="sub">' + FREQ[a.freq] + (m ? " · " + H.esc(m.name) : "") + '</span></span>' +
          '<button class="h-link" data-del-ahd="' + a.id + '">ўчириш</button></div>';
      }).join("") + '</div></div>' : '<div class="h-empty">Аҳдлар йўқ.</div>';
    }

    if (tab === "sana") {
      h += '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Муҳим сана қўшиш</h3></div>' +
        '<form data-form="event" class="h-form">' +
        '<div class="h-field wide"><label>Номи</label><input class="h-in" name="title" required placeholder="Никоҳ тўйи, ота-онанинг никоҳ куни…"></div>' +
        '<div class="h-field"><label>Сана</label><input class="h-in" type="date" name="date" required></div>' +
        '<div class="h-field"><button class="h-btn pri" style="margin-top:18px">Қўшиш</button></div></form></div>';
      const up = upcoming();
      h += up.length ? '<div class="h-card" data-m="oila"><div class="h-list">' + up.map(u =>
        '<div class="h-item"><span class="ttl">' + H.esc(u.title) +
        '<span class="sub">' + H.fmtDate(u.iso) + (u.kind === "tug" ? " · туғилган кун" : "") + '</span></span>' +
        '<span class="num">' + (u.days === 0 ? "бугун" : u.days + " кун") + '</span></div>').join("") +
        '</div></div>' : '<div class="h-empty">Сана йўқ. Аъзоларга туғилган кун ёзсангиз, шу ерда кўринади.</div>';
      if (d.events.length) h += '<div class="h-card" data-m="oila"><div class="h-sec-h">Қўлда киритилганлар</div><div class="h-list">' +
        d.events.map(e => '<div class="h-item"><span class="ttl">' + H.esc(e.title) + '</span>' +
          '<span class="num">' + H.fmtDate(e.date) + '</span>' +
          '<button class="h-link" data-del-event="' + e.id + '">ўчириш</button></div>').join("") + '</div></div>';
    }

    el.innerHTML = h;
  }

  function memberForm() {
    const m = (editing && editing.t === "azo") ? editing.v : {};
    return '<form data-form="azo" class="h-form">' +
      '<input type="hidden" name="id" value="' + (m.id || "") + '">' +
      '<div class="h-field wide"><label>Исми</label><input class="h-in" name="name" required value="' + H.esc(m.name || "") + '"></div>' +
      '<div class="h-field"><label>Кимлиги</label><select class="h-in" name="rel">' +
      RELS.map(r => '<option' + (r === m.rel ? " selected" : "") + '>' + r + '</option>').join("") + '</select></div>' +
      '<div class="h-field"><label>Туғилган куни</label><input class="h-in" type="date" name="birth" value="' + (m.birth || "") + '"></div>' +
      '<div class="h-field"><label>Телефон</label><input class="h-in" name="phone" value="' + H.esc(m.phone || "") + '"></div>' +
      '<div class="h-field wide"><label>Эслатма</label><input class="h-in" name="note" value="' + H.esc(m.note || "") + '"></div>' +
      '<div class="h-field wide h-row"><button class="h-btn pri">' + (m.id ? "Сақлаш" : "Қўшиш") + '</button>' +
      (m.id ? '<button type="button" class="h-btn sm" data-cancel="1">Бекор</button>' : '') + '</div></form>';
  }

  function onClick(e) {
    const el = e.currentTarget, d = data();
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; editing = null; render(el); return; }
    const a = e.target.closest("[data-ahd]");
    if (a) { toggle(d.ahds.filter(x => x.id === a.dataset.ahd)[0]); render(el); H.emit("today"); return; }
    const tc = e.target.closest("[data-touch]");
    if (tc) { const m = member(tc.dataset.touch); if (m) { m.last = H.today(); H.store.save(NS); render(el); } return; }
    const sc = e.target.closest("[data-score]");
    if (sc) {
      const wk = H.weekKey(H.today());
      d.week[wk] = Object.assign({}, d.week[wk], { score: +sc.dataset.score });
      H.store.save(NS); render(el); return;
    }
    const ea = e.target.closest("[data-edit-azo]");
    if (ea) { editing = { t: "azo", v: member(ea.dataset.editAzo) }; render(el); return; }
    const da = e.target.closest("[data-del-azo]");
    if (da) {
      if (!confirm("Аъзо ўчирилсинми?")) return;
      d.members = d.members.filter(m => m.id !== da.dataset.delAzo);
      H.store.save(NS); render(el); return;
    }
    const dh = e.target.closest("[data-del-ahd]");
    if (dh) { d.ahds = d.ahds.filter(x => x.id !== dh.dataset.delAhd); H.store.save(NS); render(el); H.emit("today"); return; }
    const de = e.target.closest("[data-del-event]");
    if (de) { d.events = d.events.filter(x => x.id !== de.dataset.delEvent); H.store.save(NS); render(el); return; }
    if (e.target.closest("[data-cancel]")) { editing = null; render(el); }
  }

  function onSubmit(e) {
    e.preventDefault();
    const el = e.currentTarget, d = data();
    const f = e.target, kind = f.dataset.form;
    const val = n => (f.elements[n] ? String(f.elements[n].value).trim() : "");
    if (kind === "azo") {
      const id = val("id");
      const rec = { id: id || H.id(), name: val("name"), rel: val("rel"), birth: val("birth"), phone: val("phone"), note: val("note") };
      if (!rec.name) return;
      if (id) {
        const old = member(id);
        Object.assign(old, rec, { last: old.last });
      } else d.members.push(rec);
      editing = null; H.store.save(NS); render(el); return;
    }
    if (kind === "ahd") {
      if (!val("title")) return;
      d.ahds.push({ id: H.id(), title: val("title"), memberId: val("memberId"), freq: val("freq") || "kun" });
      H.store.save(NS); render(el); H.emit("today"); return;
    }
    if (kind === "event") {
      if (!val("title") || !val("date")) return;
      d.events.push({ id: H.id(), title: val("title"), date: val("date") });
      H.store.save(NS); render(el); return;
    }
    if (kind === "week") {
      const wk = H.weekKey(H.today());
      d.week[wk] = Object.assign({}, d.week[wk], { note: val("note") });
      H.store.save(NS); render(el);
    }
  }
})(window.H);
