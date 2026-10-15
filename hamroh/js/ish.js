/* ============ Иш ============
   Ишга келиш-кетиш вақти, ойлик ҳисобот ва вазифалар рўйхати. */
(function (H) {
  const NS = "ish";
  const DEF = { days: {}, tasks: [], cfg: { start: "09:00", end: "18:00", workdays: [1, 2, 3, 4, 5] } };
  const PRIO = { 3: ["Шошилинч", "warn"], 2: ["Муҳим", "gold"], 1: ["Оддий", ""] };

  H.store.get(NS, DEF);          /* бошланғич қийматни дарҳол рўйхатдан ўтказамиз */
  const data = () => H.store.get(NS, DEF);
  const day = iso => data().days[iso] || null;

  H.ishToday = function () {
    const d = data(), rec = day(H.today()) || {};
    const now = H.nowMin();
    const mins = rec.in != null ? ((rec.out != null ? rec.out : now) - rec.in) : 0;
    return { rec, mins: Math.max(0, mins), open: rec.in != null && rec.out == null, cfg: d.cfg };
  };
  H.ishTasks = function () {
    const d = data(), today = H.today();
    const open = d.tasks.filter(t => !t.done);
    return {
      open,
      today: open.filter(t => t.due && t.due <= today),
      late: open.filter(t => t.due && t.due < today)
    };
  };

  function monthRows(key) {
    const d = data();
    return H.monthDays(key).filter(iso => iso <= H.today() && d.days[iso]).map(iso => {
      const r = d.days[iso];
      const mins = (r.in != null && r.out != null) ? r.out - r.in : null;
      const late = r.in != null && r.in > H.toMin(d.cfg.start);
      return { iso, r, mins, late };
    });
  }

  let tab = "bugun", viewMonth = null, taskFilter = "open";

  H.mod({
    id: NS, title: "Иш",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); el.addEventListener("change", onChange); },
    show(el) { render(el); }
  });

  function render(el) {
    const d = data(), today = H.today(), t = H.ishToday();
    let h = '<div class="h-seg" style="margin-bottom:16px">' +
      [["bugun", "Бугун"], ["oy", "Ойлик ҳисобот"], ["vazifa", "Вазифалар"], ["sozlama", "Созлама"]]
        .map(([k, nm]) => '<button data-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + nm + '</button>').join("") +
      '</div>';

    if (tab === "bugun") {
      const rec = t.rec;
      const lateBy = rec.in != null ? rec.in - H.toMin(d.cfg.start) : null;
      h += '<div class="h-card lift" data-m="ish"><div class="h-card-h"><h3>' + H.fmtLong(today) + '</h3>' +
        '<span class="h-pill' + (t.open ? "" : (rec.out != null ? " ok" : "")) + '">' +
        (rec.in == null ? "ҳали келмадим" : (t.open ? "ишдаман" : "кун якунланди")) + '</span></div>' +
        '<div class="h-stats" style="margin-bottom:14px">' +
        '<div class="h-stat"><b>' + (rec.in != null ? H.hm(rec.in) : "—") + '</b><span>келдим</span></div>' +
        '<div class="h-stat"><b>' + (rec.out != null ? H.hm(rec.out) : "—") + '</b><span>кетдим</span></div>' +
        '<div class="h-stat"><b>' + H.hm(t.mins) + '</b><span>иш вақти</span></div>' +
        (lateBy != null && lateBy > 0
          ? '<div class="h-stat"><b style="color:var(--red)">+' + lateBy + '</b><span>дақиқа кечикиш</span></div>' : '') +
        '</div>' +
        '<div class="h-row">' +
        (rec.in == null
          ? '<button class="h-btn pri" data-act="in">Ишга келдим</button>'
          : (rec.out == null
            ? '<button class="h-btn pri" data-act="out">Ишдан кетдим</button>'
            : '<button class="h-btn sm" data-act="reopen">Кетишни бекор қилиш</button>')) +
        '</div>' +
        '<form data-form="day" class="h-form" style="margin-top:14px">' +
        '<div class="h-field"><label>Келиш вақти</label><input class="h-in" type="time" name="in" value="' + (rec.in != null ? H.hm(rec.in) : "") + '"></div>' +
        '<div class="h-field"><label>Кетиш вақти</label><input class="h-in" type="time" name="out" value="' + (rec.out != null ? H.hm(rec.out) : "") + '"></div>' +
        '<div class="h-field wide"><label>Изоҳ</label><input class="h-in" name="note" value="' + H.esc(rec.note || "") + '" placeholder="Йўлда тирбандлик, шифокорга бордим…"></div>' +
        '<div class="h-field wide"><button class="h-btn sm">Вақтни қўлда сақлаш</button></div></form></div>';

      const tk = H.ishTasks();
      h += '<div class="h-card" data-m="ish"><div class="h-card-h"><h3>Бугунги вазифалар</h3>' +
        '<span class="h-pill' + (tk.late.length ? " warn" : "") + '">' + tk.today.length + ' та</span></div>' +
        (tk.today.length ? '<div class="h-list">' + tk.today.map(taskRow).join("") + '</div>'
          : '<div class="h-empty">Бугунга муддати белгиланган вазифа йўқ.</div>') + '</div>';
    }

    if (tab === "oy") {
      const mk = viewMonth || H.monthKey(today);
      const rows = monthRows(mk);
      const worked = rows.filter(r => r.mins != null);
      const total = worked.reduce((a, r) => a + r.mins, 0);
      const avgIn = rows.length ? Math.round(rows.reduce((a, r) => a + (r.r.in || 0), 0) / rows.length) : 0;
      h += '<div class="h-sec-h"><span>Ойлик ҳисобот</span><span>' +
        '<button class="h-link" data-mon="-1">‹ олдинги</button> ' + mk +
        ' <button class="h-link" data-mon="1">кейинги ›</button></span></div>' +
        '<div class="h-stats" style="margin:14px 0 18px">' +
        '<div class="h-stat"><b>' + rows.length + '</b><span>иш куни</span></div>' +
        '<div class="h-stat"><b>' + Math.round(total / 60) + '</b><span>жами соат</span></div>' +
        '<div class="h-stat"><b>' + (rows.length ? H.hm(avgIn) : "—") + '</b><span>ўртача келиш</span></div>' +
        '<div class="h-stat"><b>' + rows.filter(r => r.late).length + '</b><span>кечикиш</span></div></div>';
      h += rows.length ? '<div class="h-tablewrap"><table class="h-table"><tr>' +
        '<th>Сана</th><th>Келди</th><th>Кетди</th><th>Соат</th><th>Изоҳ</th></tr>' +
        rows.map(r => '<tr><td>' + H.fmtDate(r.iso) + ' ' + H.DAYS_S[H.date(r.iso).getDay()] + '</td>' +
          '<td class="n"' + (r.late ? ' style="color:var(--red)"' : '') + '>' + (r.r.in != null ? H.hm(r.r.in) : "—") + '</td>' +
          '<td class="n">' + (r.r.out != null ? H.hm(r.r.out) : "—") + '</td>' +
          '<td class="n">' + (r.mins != null ? H.hm(r.mins) : "—") + '</td>' +
          '<td style="white-space:normal">' + H.esc(r.r.note || "") + '</td></tr>').join("") +
        '</table></div>' : '<div class="h-empty">Бу ойда ёзув йўқ.</div>';
    }

    if (tab === "vazifa") {
      const all = d.tasks;
      const list = taskFilter === "open" ? all.filter(t => !t.done)
        : (taskFilter === "done" ? all.filter(t => t.done) : all);
      list.sort((a, b) => (b.prio - a.prio) || String(a.due || "9").localeCompare(String(b.due || "9")));
      h += '<div class="h-card" data-m="ish"><form data-form="task" class="h-form">' +
        '<div class="h-field wide"><label>Вазифа</label><input class="h-in" name="title" required placeholder="Ҳисоботни тайёрлаш"></div>' +
        '<div class="h-field"><label>Муддати</label><input class="h-in" type="date" name="due"></div>' +
        '<div class="h-field"><label>Муҳимлиги</label><select class="h-in" name="prio">' +
        '<option value="1">Оддий</option><option value="2" selected>Муҳим</option><option value="3">Шошилинч</option></select></div>' +
        '<div class="h-field wide"><button class="h-btn pri">Қўшиш</button></div></form></div>';
      h += '<div class="h-seg" style="margin-bottom:12px">' +
        [["open", "Бажарилмаган"], ["done", "Бажарилган"], ["all", "Ҳаммаси"]]
          .map(([k, nm]) => '<button data-filter="' + k + '" aria-pressed="' + (taskFilter === k) + '">' + nm + '</button>').join("") + '</div>';
      h += list.length ? '<div class="h-card" data-m="ish"><div class="h-list">' + list.map(taskRow).join("") + '</div></div>'
        : '<div class="h-empty">Рўйхат бўш.</div>';
    }

    if (tab === "sozlama") {
      h += '<div class="h-card" data-m="ish"><div class="h-card-h"><h3>Иш тартиби</h3></div>' +
        '<form data-form="cfg" class="h-form">' +
        '<div class="h-field"><label>Иш бошланиши</label><input class="h-in" type="time" name="start" value="' + d.cfg.start + '"></div>' +
        '<div class="h-field"><label>Иш тугаши</label><input class="h-in" type="time" name="end" value="' + d.cfg.end + '"></div>' +
        '<div class="h-field wide"><label>Иш кунлари</label><div class="h-row">' +
        H.DAYS.map((nm, i) => '<button type="button" class="h-btn sm' +
          (d.cfg.workdays.indexOf(i) >= 0 ? " pri" : "") + '" data-wd="' + i + '">' + H.DAYS_S[i] + '</button>').join("") +
        '</div></div>' +
        '<div class="h-field wide"><button class="h-btn pri">Сақлаш</button></div></form>' +
        '<p class="h-note" style="margin-top:10px">Кечикиш шу «иш бошланиши» вақтига қараб ҳисобланади.</p></div>';
    }

    el.innerHTML = h;
  }

  function taskRow(t) {
    const late = !t.done && t.due && t.due < H.today();
    const p = PRIO[t.prio] || PRIO[1];
    return '<div class="h-item">' +
      '<button class="h-check" data-task="' + t.id + '" aria-pressed="' + !!t.done + '">' + (t.done ? "✓" : "") + '</button>' +
      '<span class="ttl"' + (t.done ? ' style="color:var(--ink-3);text-decoration:line-through"' : '') + '>' + H.esc(t.title) +
      (t.due ? '<span class="sub">' + (late ? "муддати ўтган: " : "муддати: ") + H.fmtDate(t.due) + '</span>' : '') + '</span>' +
      (t.prio > 1 ? '<span class="h-pill ' + p[1] + '">' + p[0] + '</span>' : '') +
      '<button class="h-link" data-deltask="' + t.id + '">ўчириш</button></div>';
  }

  function onClick(e) {
    const el = e.currentTarget, d = data(), today = H.today();
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; render(el); return; }
    const f = e.target.closest("[data-filter]");
    if (f) { taskFilter = f.dataset.filter; render(el); return; }
    const a = e.target.closest("[data-act]");
    if (a) {
      const rec = d.days[today] = d.days[today] || {};
      if (a.dataset.act === "in") rec.in = H.nowMin();
      if (a.dataset.act === "out") rec.out = H.nowMin();
      if (a.dataset.act === "reopen") delete rec.out;
      H.store.save(NS); render(el); H.emit("today"); return;
    }
    const mo = e.target.closest("[data-mon]");
    if (mo) {
      const cur = viewMonth || H.monthKey(today);
      const [y, mm] = cur.split("-").map(Number);
      const dd = new Date(y, mm - 1 + (+mo.dataset.mon), 1);
      viewMonth = dd.getFullYear() + "-" + H.pad(dd.getMonth() + 1);
      render(el); return;
    }
    const tk = e.target.closest("[data-task]");
    if (tk) {
      const task = d.tasks.filter(x => x.id === tk.dataset.task)[0];
      task.done = !task.done; task.doneAt = task.done ? today : "";
      H.store.save(NS); render(el); H.emit("today"); return;
    }
    const dt = e.target.closest("[data-deltask]");
    if (dt) { d.tasks = d.tasks.filter(x => x.id !== dt.dataset.deltask); H.store.save(NS); render(el); H.emit("today"); return; }
    const wd = e.target.closest("[data-wd]");
    if (wd) {
      const i = +wd.dataset.wd, arr = d.cfg.workdays;
      const at = arr.indexOf(i);
      if (at >= 0) arr.splice(at, 1); else arr.push(i);
      arr.sort(); H.store.save(NS); render(el);
    }
  }
  function onChange() {}

  function onSubmit(e) {
    e.preventDefault();
    const el = e.currentTarget, d = data(), f = e.target;
    const val = n => (f.elements[n] ? String(f.elements[n].value).trim() : "");
    if (f.dataset.form === "day") {
      const rec = d.days[H.today()] = d.days[H.today()] || {};
      if (val("in")) rec.in = H.toMin(val("in")); else delete rec.in;
      if (val("out")) rec.out = H.toMin(val("out")); else delete rec.out;
      rec.note = val("note");
      if (rec.in == null && rec.out == null && !rec.note) delete d.days[H.today()];
      H.store.save(NS); render(el); H.emit("today"); return;
    }
    if (f.dataset.form === "task") {
      if (!val("title")) return;
      d.tasks.push({ id: H.id(), title: val("title"), due: val("due"), prio: +val("prio") || 1, done: false });
      H.store.save(NS); render(el); H.emit("today"); return;
    }
    if (f.dataset.form === "cfg") {
      d.cfg.start = val("start") || "09:00";
      d.cfg.end = val("end") || "18:00";
      H.store.save(NS); render(el);
    }
  }
})(window.H);
