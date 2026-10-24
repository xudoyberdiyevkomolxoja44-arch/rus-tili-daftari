/* ============ Ish ============
   Ishga kelish-ketish vaqti, oylik hisobot va vazifalar roʻyxati. */
(function (H) {
  const NS = "ish";
  const DEF = { days: {}, tasks: [], cfg: { start: "09:00", end: "18:00", workdays: [1, 2, 3, 4, 5] } };
  const PRIO = { 3: ["Shoshilinch", "warn"], 2: ["Muhim", "gold"], 1: ["Oddiy", ""] };

  H.store.get(NS, DEF);          /* boshlangʻich qiymatni darhol roʻyxatdan oʻtkazamiz */
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
    id: NS, title: "Ish",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); el.addEventListener("change", onChange); },
    show(el) { render(el); }
  });

  function render(el) {
    const d = data(), today = H.today(), t = H.ishToday();
    let h = '<div class="h-seg" style="margin-bottom:16px">' +
      [["bugun", "Bugun"], ["oy", "Oylik hisobot"], ["vazifa", "Vazifalar"], ["sozlama", "Sozlama"]]
        .map(([k, nm]) => '<button data-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + nm + '</button>').join("") +
      '</div>';

    if (tab === "bugun") {
      const rec = t.rec;
      const lateBy = rec.in != null ? rec.in - H.toMin(d.cfg.start) : null;
      h += '<div class="h-card lift" data-m="ish"><div class="h-card-h"><h3>' + H.fmtLong(today) + '</h3>' +
        '<span class="h-pill' + (t.open ? "" : (rec.out != null ? " ok" : "")) + '">' +
        (rec.in == null ? "hali kelmadim" : (t.open ? "ishdaman" : "kun yakunlandi")) + '</span></div>' +
        '<div class="h-stats" style="margin-bottom:14px">' +
        '<div class="h-stat"><b>' + (rec.in != null ? H.hm(rec.in) : "—") + '</b><span>keldim</span></div>' +
        '<div class="h-stat"><b>' + (rec.out != null ? H.hm(rec.out) : "—") + '</b><span>ketdim</span></div>' +
        '<div class="h-stat"><b>' + H.hm(t.mins) + '</b><span>ish vaqti</span></div>' +
        (lateBy != null && lateBy > 0
          ? '<div class="h-stat"><b style="color:var(--red)">+' + lateBy + '</b><span>daqiqa kechikish</span></div>' : '') +
        '</div>' +
        '<div class="h-row">' +
        (rec.in == null
          ? '<button class="h-btn pri" data-act="in">Ishga keldim</button>'
          : (rec.out == null
            ? '<button class="h-btn pri" data-act="out">Ishdan ketdim</button>'
            : '<button class="h-btn sm" data-act="reopen">Ketishni bekor qilish</button>')) +
        '</div>' +
        '<form data-form="day" class="h-form" style="margin-top:14px">' +
        '<div class="h-field"><label>Kelish vaqti</label><input class="h-in" type="time" name="in" value="' + (rec.in != null ? H.hm(rec.in) : "") + '"></div>' +
        '<div class="h-field"><label>Ketish vaqti</label><input class="h-in" type="time" name="out" value="' + (rec.out != null ? H.hm(rec.out) : "") + '"></div>' +
        '<div class="h-field wide"><label>Izoh</label><input class="h-in" name="note" value="' + H.esc(rec.note || "") + '" placeholder="Yoʻlda tirbandlik, shifokorga bordim…"></div>' +
        '<div class="h-field wide"><button class="h-btn sm">Vaqtni qoʻlda saqlash</button></div></form></div>';

      const tk = H.ishTasks();
      h += '<div class="h-card" data-m="ish"><div class="h-card-h"><h3>Bugungi vazifalar</h3>' +
        '<span class="h-pill' + (tk.late.length ? " warn" : "") + '">' + tk.today.length + ' ta</span></div>' +
        (tk.today.length ? '<div class="h-list">' + tk.today.map(taskRow).join("") + '</div>'
          : '<div class="h-empty">Bugunga muddati belgilangan vazifa yoʻq.</div>') + '</div>';
    }

    if (tab === "oy") {
      const mk = viewMonth || H.monthKey(today);
      const rows = monthRows(mk);
      const worked = rows.filter(r => r.mins != null);
      const total = worked.reduce((a, r) => a + r.mins, 0);
      const avgIn = rows.length ? Math.round(rows.reduce((a, r) => a + (r.r.in || 0), 0) / rows.length) : 0;
      h += '<div class="h-sec-h"><span>Oylik hisobot</span><span>' +
        '<button class="h-link" data-mon="-1">‹ oldingi</button> ' + mk +
        ' <button class="h-link" data-mon="1">keyingi ›</button></span></div>' +
        '<div class="h-stats" style="margin:14px 0 18px">' +
        '<div class="h-stat"><b>' + rows.length + '</b><span>ish kuni</span></div>' +
        '<div class="h-stat"><b>' + Math.round(total / 60) + '</b><span>jami soat</span></div>' +
        '<div class="h-stat"><b>' + (rows.length ? H.hm(avgIn) : "—") + '</b><span>oʻrtacha kelish</span></div>' +
        '<div class="h-stat"><b>' + rows.filter(r => r.late).length + '</b><span>kechikish</span></div></div>';
      h += rows.length ? '<div class="h-tablewrap"><table class="h-table"><tr>' +
        '<th>Sana</th><th>Keldi</th><th>Ketdi</th><th>Soat</th><th>Izoh</th></tr>' +
        rows.map(r => '<tr><td>' + H.fmtDate(r.iso) + ' ' + H.DAYS_S[H.date(r.iso).getDay()] + '</td>' +
          '<td class="n"' + (r.late ? ' style="color:var(--red)"' : '') + '>' + (r.r.in != null ? H.hm(r.r.in) : "—") + '</td>' +
          '<td class="n">' + (r.r.out != null ? H.hm(r.r.out) : "—") + '</td>' +
          '<td class="n">' + (r.mins != null ? H.hm(r.mins) : "—") + '</td>' +
          '<td style="white-space:normal">' + H.esc(r.r.note || "") + '</td></tr>').join("") +
        '</table></div>' : '<div class="h-empty">Bu oyda yozuv yoʻq.</div>';
    }

    if (tab === "vazifa") {
      const all = d.tasks;
      const list = taskFilter === "open" ? all.filter(t => !t.done)
        : (taskFilter === "done" ? all.filter(t => t.done) : all);
      list.sort((a, b) => (b.prio - a.prio) || String(a.due || "9").localeCompare(String(b.due || "9")));
      h += '<div class="h-card" data-m="ish"><form data-form="task" class="h-form">' +
        '<div class="h-field wide"><label>Vazifa</label><input class="h-in" name="title" required placeholder="Hisobotni tayyorlash"></div>' +
        '<div class="h-field"><label>Muddati</label><input class="h-in" type="date" name="due"></div>' +
        '<div class="h-field"><label>Muhimligi</label><select class="h-in" name="prio">' +
        '<option value="1">Oddiy</option><option value="2" selected>Muhim</option><option value="3">Shoshilinch</option></select></div>' +
        '<div class="h-field wide"><button class="h-btn pri">Qoʻshish</button></div></form></div>';
      h += '<div class="h-seg" style="margin-bottom:12px">' +
        [["open", "Bajarilmagan"], ["done", "Bajarilgan"], ["all", "Hammasi"]]
          .map(([k, nm]) => '<button data-filter="' + k + '" aria-pressed="' + (taskFilter === k) + '">' + nm + '</button>').join("") + '</div>';
      h += list.length ? '<div class="h-card" data-m="ish"><div class="h-list">' + list.map(taskRow).join("") + '</div></div>'
        : '<div class="h-empty">Roʻyxat boʻsh.</div>';
    }

    if (tab === "sozlama") {
      h += '<div class="h-card" data-m="ish"><div class="h-card-h"><h3>Ish tartibi</h3></div>' +
        '<form data-form="cfg" class="h-form">' +
        '<div class="h-field"><label>Ish boshlanishi</label><input class="h-in" type="time" name="start" value="' + d.cfg.start + '"></div>' +
        '<div class="h-field"><label>Ish tugashi</label><input class="h-in" type="time" name="end" value="' + d.cfg.end + '"></div>' +
        '<div class="h-field wide"><label>Ish kunlari</label><div class="h-row">' +
        H.DAYS.map((nm, i) => '<button type="button" class="h-btn sm' +
          (d.cfg.workdays.indexOf(i) >= 0 ? " pri" : "") + '" data-wd="' + i + '">' + H.DAYS_S[i] + '</button>').join("") +
        '</div></div>' +
        '<div class="h-field wide"><button class="h-btn pri">Saqlash</button></div></form>' +
        '<p class="h-note" style="margin-top:10px">Kechikish shu «ish boshlanishi» vaqtiga qarab hisoblanadi.</p></div>';
    }

    el.innerHTML = h;
  }

  function taskRow(t) {
    const late = !t.done && t.due && t.due < H.today();
    const p = PRIO[t.prio] || PRIO[1];
    return '<div class="h-item">' +
      '<button class="h-check" data-task="' + t.id + '" aria-pressed="' + !!t.done + '">' + (t.done ? "✓" : "") + '</button>' +
      '<span class="ttl"' + (t.done ? ' style="color:var(--ink-3);text-decoration:line-through"' : '') + '>' + H.esc(t.title) +
      (t.due ? '<span class="sub">' + (late ? "muddati oʻtgan: " : "muddati: ") + H.fmtDate(t.due) + '</span>' : '') + '</span>' +
      (t.prio > 1 ? '<span class="h-pill ' + p[1] + '">' + p[0] + '</span>' : '') +
      '<button class="h-link" data-deltask="' + t.id + '">oʻchirish</button></div>';
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
