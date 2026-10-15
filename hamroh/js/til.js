/* ============ Тил ўрганиш ============
   Саккиз тил учун битта тизим: ёзув, луғат, иборалар, грамматика,
   90 кунлик режа ва Лейтнер усулидаги такрорлаш.
   Ҳар бир тилнинг контенти js/langs/*.js да. */
(function (H) {
  const NS = "til";
  const DEF = { cur: "", langs: {}, _m: 0 };
  const DAYMS = 86400000;
  const INTERVALS = [0, 1, 2, 4, 7, 14, 30];
  const DPM = 30, EXAM_DAY = 30, LETTER_DAYS = 7, REV_TARGET = 20;
  const REVIEW_DAYS = new Set([5, 10, 15, 20, 25]);
  const GRAM_DAYS = [3, 11, 19, 26];
  const MONTH_EXAM = { count: 20, pass: .85 };
  const QUARTER_EXAM = { count: 40, pass: .85 };
  const ACUTE = "́";

  H.langs = [];
  H.lang = def => { H.langs.push(def); return def; };
  const langDef = id => H.langs.filter(l => l.id === id)[0];

  const todayIdx = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAYMS); };
  const data = () => H.store.get(NS, DEF);

  function newState() {
    return {
      cards: {}, streak: 0, lastDay: 0, day: 0, done: 0, goal: 20, topics: [],
      mode: "flip", dir: "n2u",
      plan: { day: 1, finished: {}, gram: {}, script: {}, exams: {}, rev: {} }
    };
  }
  function S(id) {
    const d = data();
    if (!d.langs[id]) d.langs[id] = newState();
    const s = d.langs[id];
    s.plan = Object.assign({ day: 1, finished: {}, gram: {}, script: {}, exams: {}, rev: {} }, s.plan || {});
    ["finished", "gram", "script", "exams", "rev"].forEach(k => { if (!s.plan[k] || typeof s.plan[k] !== "object") s.plan[k] = {}; });
    if (s.day !== todayIdx()) { s.day = todayIdx(); s.done = 0; }
    return s;
  }
  const save = () => H.store.save(NS);

  /* эски «Рус тили дафтари» натижасини кўчириб олиш */
  (function migrate() {
    const d = data();
    if (d._m) return;
    try {
      const old = JSON.parse(localStorage.getItem("rus-daftar-v1"));
      if (old && old.cards && Object.keys(old.cards).length) {
        const s = newState();
        s.cards = old.cards; s.streak = old.streak || 0; s.lastDay = old.lastDay || 0;
        s.day = old.day || 0; s.done = old.done || 0; s.goal = old.goal || 20;
        s.topics = old.topics || []; s.mode = old.mode || "flip";
        s.dir = old.dir === "uz2ru" ? "u2n" : "n2u";
        const p = old.plan || {};
        s.plan = {
          day: p.day || 1, finished: p.finished || {}, gram: p.gram || {},
          script: p.letters || {}, exams: p.exams || {}, rev: p.rev || {}
        };
        d.langs.ru = s;
        if (!d.cur) d.cur = "ru";
      }
    } catch (e) {}
    d._m = 1;
    save();
  })();

  /* ---------- контентдан тузилган тил объекти ---------- */
  const built = {};
  function L(id) {
    if (built[id]) return built[id];
    const def = langDef(id);
    if (!def) return null;
    const items = [], byId = new Map();
    (def.topics || []).forEach(([tid]) => (def.words[tid] || []).forEach((r, i) =>
      items.push({ id: tid + i, topic: tid, native: r[0], pron: r[1], uz: r[2], extra: r[3] || "", kind: "word" })));
    (def.phrases || []).forEach(([g, list]) => list.forEach(r =>
      items.push({ id: "ph" + items.filter(x => x.kind === "phrase").length, topic: "ph", group: g, native: r[0], pron: r[1], uz: r[2], extra: r[3] || "", kind: "phrase" })));
    items.forEach(it => byId.set(it.id, it));
    const o = Object.assign({}, def, { items, byId, plan: buildPlan(def, items) });
    built[id] = o;
    return o;
  }

  function buildPlan(def, items) {
    const days = [];
    (def.months || []).forEach((mo, mi) => {
      const pool = [];
      (mo.topics || []).forEach(t => items.filter(w => w.topic === t).forEach(w => pool.push(w.id)));
      (mo.phrases || []).forEach(g => items.filter(w => w.group === g).forEach(w => pool.push(w.id)));
      const learnDays = [];
      for (let d = 1; d <= DPM; d++) if (d !== EXAM_DAY && !REVIEW_DAYS.has(d)) learnDays.push(d);
      const per = Math.max(1, Math.ceil(pool.length / learnDays.length));
      const scriptDays = mo.script ? learnDays.slice(0, LETTER_DAYS) : [];
      const chars = (def.script && def.script.items) ? def.script.items.length : 0;
      const perL = scriptDays.length ? Math.ceil(chars / scriptDays.length) : 0;
      let pi = 0, li = 0;
      for (let d = 1; d <= DPM; d++) {
        const n = mi * DPM + d;
        if (d === EXAM_DAY) {
          days.push({ n, mi, d, kind: "exam", examId: "m" + (mi + 1), count: MONTH_EXAM.count, pass: MONTH_EXAM.pass, items: pool.slice(), title: "Ой имтиҳони" });
          continue;
        }
        const day = { n, mi, d, kind: REVIEW_DAYS.has(d) ? "review" : "learn", items: [], chars: [], gram: [] };
        if (day.kind === "learn") {
          day.items = pool.slice(pi, pi + per); pi += per;
          if (scriptDays.indexOf(d) >= 0 && chars) {
            day.chars = []; for (let k = li; k < Math.min(chars, li + perL); k++) day.chars.push(k);
            li += perL;
          }
        }
        const gi = GRAM_DAYS.indexOf(d);
        if (gi >= 0 && (mo.grammar || [])[gi] !== undefined) day.gram = [mo.grammar[gi]];
        days.push(day);
      }
    });
    return days;
  }

  /* ---------- кичик ёрдамчилар ---------- */
  const esc = H.esc;
  function markStress(s) {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      if (s[i + 1] === ACUTE) { out += '<span class="t-st">' + esc(s[i]) + ACUTE + "</span>"; i++; }
      else out += esc(s[i]);
    }
    return out;
  }
  const plain = s => String(s).split(ACUTE).join("");
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function voiceFor(code) {
    const base = code.split("-")[0];
    return voices.filter(v => v.lang && v.lang.toLowerCase().indexOf(base) === 0)[0] || null;
  }
  function speak(text, code) {
    if (!("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain(text));
      u.lang = code; u.rate = .82;
      const v = voiceFor(code); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  const SPK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 4 8 8.5H4v7h4L13 20V4z"/><path d="M16.5 8.8a4.5 4.5 0 0 1 0 6.4" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/></svg>';
  const sayBtn = t => '<button class="t-say" data-say="' + esc(plain(t)) + '" title="Эшитиш" aria-label="Эшитиш">' + SPK + "</button>";

  /* ---------- SRS ---------- */
  const card = (s, id) => s.cards[id] || null;
  function grade(id, ok) {
    const s = S(cur), t = todayIdx();
    const c = s.cards[id] = s.cards[id] || { box: 0, due: t, seen: 0, ok: 0, bad: 0 };
    c.seen++;
    if (ok) { c.ok++; c.box = Math.min(6, c.box + 1); }
    else { c.bad++; c.box = c.box > 2 ? 2 : 0; }
    c.due = t + INTERVALS[c.box];
    s.done++;
    if (session) { const k = String(session.n); s.plan.rev[k] = (s.plan.rev[k] || 0) + 1; }
    if (s.lastDay !== t) { s.streak = (s.lastDay === t - 1) ? s.streak + 1 : 1; s.lastDay = t; }
    save(); H.emit("today");
  }
  const learned = (s, id) => { const c = card(s, id); return !!c && c.box >= 2; };
  function dueCount(id) {
    const s = S(id), lang = L(id), t = todayIdx();
    if (!lang) return 0;
    return lang.items.reduce((n, w) => { const c = card(s, w.id); return n + (c && c.due <= t ? 1 : 0); }, 0);
  }
  function knownCount(id) {
    const s = S(id), lang = L(id);
    if (!lang) return 0;
    return lang.items.filter(w => { const c = card(s, w.id); return c && c.box >= 4; }).length;
  }

  /* бош саҳифа учун */
  H.tilSummary = function () {
    const d = data();
    const id = d.cur || (Object.keys(d.langs)[0] || "");
    if (!id || !langDef(id)) return { started: false, langs: Object.keys(d.langs).length };
    const s = S(id), lang = L(id);
    return {
      started: true, id, name: lang.name, day: s.plan.day, due: dueCount(id),
      done: s.done, goal: s.goal, known: knownCount(id), total: lang.items.length,
      langs: Object.keys(d.langs).length
    };
  };

  /* ---------- ҳолат ---------- */
  let cur = "", view = "pick", tab = "plan", el = null;
  let queue = [], item = null, shown = false, answered = false, session = null;
  let planView = { type: "overview", month: null, sel: null }, exam = null, cq = null;
  let search = "";

  H.mod({
    id: NS, title: "Тил ўрганиш",
    init(node) {
      el = node;
      node.addEventListener("click", onClick);
      node.addEventListener("input", onInput);
      node.addEventListener("keydown", onKey);
      const d = data();
      if (d.cur && langDef(d.cur)) { cur = d.cur; view = "course"; }
    },
    show() { render(); }
  });

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-say]");
    if (b && cur) speak(b.getAttribute("data-say"), L(cur).speech);
  });
  document.addEventListener("keydown", e => {
    if (H.active() !== NS || view !== "course" || tab !== "drill" || !item) return;
    if (e.target.tagName === "INPUT") return;
    const s = S(cur);
    if (s.mode === "flip") {
      if (e.code === "Space") { e.preventDefault(); if (!shown) { shown = true; render(); } }
      else if (e.key === "1" && shown) { grade(item.id, false); next(); render(); }
      else if (e.key === "2" && shown) { grade(item.id, true); next(); render(); }
    } else if (s.mode === "choice" && /^[1-4]$/.test(e.key)) {
      const b = el.querySelectorAll(".t-opt")[+e.key - 1];
      if (b && !b.disabled) b.click();
    }
  });

  /* ================= чизиш ================= */
  function render() {
    if (!el) return;
    if (view === "pick" || !cur || !langDef(cur)) return renderPick();
    const lang = L(cur);
    let h = '<div class="t-bar">' +
      '<button class="h-btn sm" data-act="pick">← Тиллар</button>' +
      '<b class="t-cur">' + esc(lang.name) + '</b>' +
      '<span class="t-prog">' + knownCount(cur) + "/" + lang.items.length + "</span></div>";
    h += '<nav class="t-tabs">' + [
      ["plan", "Режа"], ["drill", "Машқ"], ["vocab", "Луғат"], ["phrase", "Иборалар"],
      ["script", lang.script ? lang.script.title : "Ёзув"], ["gram", "Грамматика"]
    ].map(([k, nm]) => '<button class="t-tab" data-tab="' + k + '" aria-selected="' + (tab === k) + '">' + nm + "</button>").join("") + "</nav>";
    h += '<div class="t-body">' +
      (tab === "plan" ? renderPlan() : tab === "drill" ? renderDrill() : tab === "vocab" ? renderVocab()
        : tab === "phrase" ? renderPhrase() : tab === "script" ? renderScript() : renderGram()) +
      "</div>";
    el.innerHTML = h;
    if (tab === "drill" && S(cur).mode === "write") {
      const inp = el.querySelector("#t-in"); if (inp) inp.focus();
    }
    if (tab === "vocab") { const s = el.querySelector("#t-search"); if (s) { s.value = search; } }
  }

  function renderPick() {
    const d = data();
    let h = '<h2 class="h-h2">Қайси тилни ўрганамиз?</h2>' +
      '<p class="h-lede">Ҳар бир тил учун алоҳида 90 кунлик режа, луғат, иборалар, ёзув ва грамматика. ' +
      'Бир нечтасини баравар олиб бориш мумкин — натижалар аралашмайди.</p><div class="t-pick">';
    H.langs.forEach(lg => {
      const has = !!d.langs[lg.id];
      const s = has ? S(lg.id) : null;
      const lang = L(lg.id);
      const known = has ? knownCount(lg.id) : 0;
      const due = has ? dueCount(lg.id) : 0;
      h += '<button class="t-lang" data-lang="' + lg.id + '">' +
        '<span class="t-code ' + lg.id + '">' + esc(lg.code) + "</span>" +
        "<b>" + esc(lg.name) + "</b>" +
        '<span class="t-native">' + esc(lg.native) + "</span>" +
        (has
          ? '<span class="t-meta">' + s.plan.day + "-кун · " + known + "/" + lang.items.length + " сўз" +
            (due ? ' · <i class="t-due">' + due + " такрор</i>" : "") + "</span>" +
            H.bar(known, lang.items.length, known >= lang.items.length * .8)
          : '<span class="t-meta">' + lang.items.length + " сўз · " + (lang.script ? lang.script.items.length + " белги · " : "") +
            lang.grammar.length + " қоида</span><span class=\"t-start\">бошлаш →</span>") +
        "</button>";
    });
    h += "</div>";
    el.innerHTML = h;
  }

  /* ---------- режа ---------- */
  const dayOf = n => L(cur).plan[n - 1];
  const curN = () => S(cur).plan.day;
  const LAST = () => L(cur).plan.length;
  const curMonth = () => Math.min(L(cur).months.length - 1, Math.floor((Math.min(curN(), LAST()) - 1) / DPM));

  function dayTasks(day) {
    const s = S(cur), lang = L(cur), t = [];
    if (day.kind === "exam") {
      const ex = s.plan.exams[day.examId];
      t.push({ key: "exam", act: "exam", done: !!(ex && ex.passed), nopg: true,
        label: "Имтиҳон: " + day.count + " савол · ўтиш чегараси " + Math.round(day.pass * 100) + "%",
        btn: (ex && ex.passed) ? "Қайта топшириш" : "Имтиҳонни бошлаш",
        note: ex ? (ex.tries + " уриниш · энг яхши " + Math.round(ex.best * 100) + "%") : "" });
      return t;
    }
    if (day.chars.length) {
      const dn = day.chars.filter(i => s.plan.script[i]).length;
      t.push({ key: "sc", act: "chars", a: dn, b: day.chars.length, done: dn === day.chars.length,
        label: day.chars.length + " та " + (lang.script.unit || "ҳарф") + "ни ёдлаш", btn: "Текшириш" });
    }
    if (day.items.length) {
      const dn = day.items.filter(id => learned(s, id)).length;
      t.push({ key: "learn", act: "drill", a: dn, b: day.items.length, done: dn === day.items.length,
        label: day.items.length + " та янги сўз ва ибора", btn: "Машқни бошлаш" });
    }
    if (day.kind === "review") {
      const dn = Math.min(REV_TARGET, s.plan.rev[day.n] || 0);
      t.push({ key: "rev", act: "drill", a: dn, b: REV_TARGET, done: dn >= REV_TARGET,
        label: REV_TARGET + " та сўзни қайта машқ қилиш", btn: "Такрорлашни бошлаш" });
    }
    const due = dueCount(cur);
    t.push({ key: "due", act: "drill", done: due === 0, nopg: true,
      label: due ? ("Муддати келган " + due + " та сўзни такрорлаш") : "Муддати келган такрор йўқ",
      btn: due ? "Такрорлаш" : null });
    day.gram.forEach(gi => t.push({ key: "g" + gi, act: "gram:" + gi, done: !!s.plan.gram[gi], nopg: true,
      label: "Грамматика: " + lang.grammar[gi].t, btn: "Қоидани ўқиш" }));
    return t;
  }
  const dayComplete = day => dayTasks(day).every(x => x.done);

  function dayTitle(day) {
    const lang = L(cur);
    if (day.kind === "review") return "Мустаҳкамлаш куни";
    if (day.kind === "exam") return "Ой имтиҳони";
    const names = [];
    day.items.forEach(id => {
      const it = lang.byId.get(id);
      if (!it) return;
      const nm = it.kind === "phrase" ? "Иборалар" : (lang.topics.filter(x => x[0] === it.topic)[0] || ["", ""])[1];
      if (nm && names.indexOf(nm) < 0) names.push(nm);
    });
    const all = (day.chars.length ? [lang.script.title] : []).concat(names);
    return all.length ? all.slice(0, 2).join(" · ") : "Такрорлаш";
  }

  function renderPlan() {
    const s = S(cur), lang = L(cur);
    if (planView.type === "exam" && exam) return renderExam();
    if (planView.type === "chars" && cq) return renderCharQuiz();
    const cn = curN(), last = LAST();
    const done = Math.min(cn - 1, last);
    const cmi = cn > last ? lang.months.length : curMonth();
    const mi = planView.month === null ? Math.min(cmi, lang.months.length - 1) : planView.month;
    const sel = planView.sel && planView.sel <= cn ? planView.sel : Math.min(cn, last);

    let h = '<div class="t-qhead"><h2>' + esc(lang.quarter.title) + "</h2><p>" + esc(lang.quarter.goal) + "</p>" +
      '<div class="t-qbar">' + H.bar(done, last) + "<span>" + done + " / " + last + " кун</span></div></div>";
    h += '<div class="t-months">' + lang.months.map((mo, i) => {
      const st = i < cmi ? "done" : (i === cmi ? "now" : "lock");
      const dIn = lang.plan.filter(x => x.mi === i && x.n < cn).length;
      const ex = s.plan.exams["m" + (i + 1)];
      return '<button class="t-mcard" data-month="' + i + '" data-state="' + st + '"' + (st === "lock" ? " disabled" : "") + ">" +
        "<b>" + esc(mo.title) + "</b><span>" + esc(mo.goal) + "</span><span class=\"t-mmeta\">" +
        (st === "lock" ? "олдинги ой тугагач очилади" : dIn + "/" + DPM + " кун" + (ex && ex.passed ? " · имтиҳон ✓" : "")) +
        "</span></button>";
    }).join("") + "</div>";

    h += '<h3 class="t-mtitle">' + esc(lang.months[mi].title) + "</h3>" +
      '<p class="h-note" style="margin:-2px 0 10px">' + esc(lang.months[mi].goal) + "</p>";
    h += '<div class="t-daygrid">' + lang.plan.filter(x => x.mi === mi).map(x => {
      let st;
      if (x.n < cn) st = x.kind === "exam" ? "exam-done" : "done";
      else if (x.n === cn) st = "now";
      else st = x.kind === "exam" ? "exam" : "lock";
      return '<button class="t-dcell' + (x.n === sel ? " sel" : "") + '" data-s="' + st + '" data-day="' + x.n + '"' +
        (x.n > cn ? " disabled" : "") + ' title="Кун ' + x.n + '">' + (x.kind === "exam" ? "★" : x.d) + "</button>";
    }).join("") + "</div>";

    h += cn > last ? quarterCard() : dayCard(dayOf(sel), sel === cn);
    return h;
  }

  function dayCard(day, isCur) {
    const s = S(cur), lang = L(cur);
    const tasks = dayTasks(day);
    const fin = s.plan.finished[day.n];
    let h = '<div class="t-today"><div class="t-tline"><span class="t-tday">Кун ' + day.n + " · " +
      (day.kind === "exam" ? "имтиҳон" : day.kind === "review" ? "мустаҳкамлаш" : "янги мавзу") + "</span>" +
      (fin ? '<span class="t-tday">' + esc(fin) + " да тугалланди</span>" : "") + "</div>" +
      "<h3>" + esc(dayTitle(day)) + "</h3>";
    if (!isCur) {
      h += '<div class="t-doneflag">Бу кун тугалланган.</div>';
      if (day.items.length) h += '<p class="h-note">' + day.items.slice(0, 12).map(id => {
        const it = lang.byId.get(id); return it ? '<span class="t-nat">' + markStress(it.native) + "</span>" : "";
      }).join(", ") + "</p>";
      return h + "</div>";
    }
    h += '<div class="t-tasks">' + tasks.map(t =>
      '<div class="t-task' + (t.done ? " ok" : "") + '"><span class="t-box">' + (t.done ? "✓" : "") + "</span>" +
      '<span class="t-tx">' + esc(t.label) + (t.note ? ' <span class="h-note">· ' + esc(t.note) + "</span>" : "") + "</span>" +
      (t.nopg || t.b === undefined ? "" : '<span class="t-pg">' + t.a + "/" + t.b + "</span>") +
      (t.done || !t.btn ? "" : '<button class="h-btn sm" data-act="' + t.act + '" data-day="' + day.n + '">' + t.btn + "</button>") +
      "</div>").join("") + "</div>";
    if (day.items.length) h += '<p class="h-note" style="margin:0 0 12px">' + day.items.slice(0, 10).map(id => {
      const it = lang.byId.get(id); return it ? '<span class="t-nat">' + markStress(it.native) + "</span>" : "";
    }).join(", ") + "</p>";
    const ready = tasks.every(t => t.done);
    h += '<div class="h-row">' + (ready
      ? '<button class="h-btn pri" data-act="next">Кейинги кунга ўтиш →</button>'
      : '<button class="h-btn pri" data-act="drill" data-day="' + day.n + '">Бугунги машқни бошлаш</button>') + "</div>";
    if (!ready) h += '<p class="h-note" style="margin:12px 0 0">🔒 Кейинги кун барча топшириқ бажарилгач очилади.</p>';
    return h + "</div>";
  }

  function quarterCard() {
    const s = S(cur);
    const ex = s.plan.exams.q1;
    let h = '<div class="t-today"><div class="t-tline"><span class="t-tday">Якуний босқич</span></div><h3>Чорак имтиҳони</h3>';
    if (ex && ex.passed) {
      h += '<div class="t-doneflag">Чорак тугалланди — ' + Math.round(ex.best * 100) + "% натижа билан.</div>" +
        '<p class="h-note">Энди «Машқ» бўлимида эркин такрорлашни давом эттиринг: тизим ҳар сўзни муддати келганда ўзи қайтаради.</p>';
    } else {
      h += '<p class="h-note">Уч ойлик материалдан ' + QUARTER_EXAM.count + " та савол. Ўтиш чегараси " +
        Math.round(QUARTER_EXAM.pass * 100) + "%." + (ex ? " Энг яхши натижа: " + Math.round(ex.best * 100) + "%." : "") + "</p>" +
        '<div class="h-row" style="margin-top:10px"><button class="h-btn pri" data-act="qexam">Имтиҳонни бошлаш</button></div>';
    }
    return h + "</div>";
  }

  /* ---------- имтиҳон ---------- */
  function startExam(day) {
    const lang = L(cur), s = S(cur);
    const isQ = day === "quarter";
    const ids = isQ ? lang.items.filter(w => card(s, w.id)).map(w => w.id) : day.items;
    const src = shuffle((ids.length ? ids : lang.items.map(w => w.id)).slice())
      .slice(0, isQ ? QUARTER_EXAM.count : day.count);
    exam = {
      id: isQ ? "q1" : day.examId, pass: isQ ? QUARTER_EXAM.pass : day.pass,
      title: isQ ? "Чорак имтиҳони" : (lang.months[day.mi].title.split("—")[0].trim() + " имтиҳони"),
      qs: src.map(id => {
        const it = lang.byId.get(id);
        const near = lang.items.filter(w => w.id !== id && w.kind === it.kind);
        return { it, opts: shuffle([it].concat(shuffle(near.slice()).slice(0, 3))) };
      }), i: 0, right: 0, answered: false
    };
    planView = { type: "exam", month: planView.month, sel: planView.sel };
    render();
  }
  function renderExam() {
    if (exam.finished) {
      const ok = exam.score >= exam.pass;
      return '<div class="t-today" style="text-align:center"><span class="t-tday">' + esc(exam.title) + "</span>" +
        '<div class="t-score ' + (ok ? "pass" : "fail") + '">' + Math.round(exam.score * 100) + "%</div>" +
        '<p class="h-note">' + exam.right + " / " + exam.qs.length + " тўғри — " +
        (ok ? "имтиҳон топширилди, кейинги босқич очилди." : "ўтиш учун " + Math.round(exam.pass * 100) + "% керак.") + "</p>" +
        '<div class="h-row" style="justify-content:center;margin-top:12px">' +
        (ok ? "" : '<button class="h-btn" data-act="retry">Қайта топшириш</button>') +
        '<button class="h-btn pri" data-act="back">Режага қайтиш</button></div></div>';
    }
    const q = exam.qs[exam.i];
    return '<div class="t-meta"><span>' + esc(exam.title) + "</span><span>Савол " + (exam.i + 1) + " / " + exam.qs.length + "</span></div>" +
      '<div class="t-card"><div class="t-ask">Тўғри таржимани танланг</div>' + natBlock(q.it) + "</div>" +
      '<div class="t-opts">' + q.opts.map((o, i) => {
        let cls = "t-opt";
        if (exam.answered) { if (o.id === q.it.id) cls += " right"; else if (o.id === exam.picked) cls += " wrong"; }
        return '<button class="' + cls + '" data-exam="' + o.id + '"' + (exam.answered ? " disabled" : "") + ">" +
          '<span class="t-n">' + (i + 1) + "</span><span>" + esc(o.uz) + "</span></button>";
      }).join("") + "</div>" +
      '<div class="h-row" style="justify-content:center;margin-top:12px"><button class="h-link" data-act="back">Чиқиш</button></div>';
  }
  function answerExam(id) {
    if (exam.answered) return;
    exam.answered = true; exam.picked = id;
    const q = exam.qs[exam.i];
    const ok = id === q.it.id;
    if (ok) exam.right++;
    render();
    setTimeout(() => {
      exam.i++; exam.answered = false;
      if (exam.i >= exam.qs.length) {
        const s = S(cur);
        exam.score = exam.right / exam.qs.length;
        const rec = s.plan.exams[exam.id] || { tries: 0, best: 0, passed: false };
        rec.tries++; rec.best = Math.max(rec.best, exam.score);
        rec.passed = rec.passed || exam.score >= exam.pass;
        s.plan.exams[exam.id] = rec; exam.finished = true;
        save();
      }
      render();
    }, ok ? 550 : 1300);
  }

  /* ---------- ёзув белгилари машқи ---------- */
  function startChars(day) {
    const s = S(cur), lang = L(cur);
    let q = day.chars.filter(i => !s.plan.script[i]);
    if (!q.length) q = day.chars.slice();
    cq = { queue: shuffle(q), cur: null, answered: false, ok: false };
    nextChar();
    planView = { type: "chars", month: planView.month, sel: planView.sel };
    render();
  }
  function nextChar() {
    const lang = L(cur);
    cq.cur = cq.queue.shift();
    cq.answered = false;
    if (cq.cur === undefined) { cq = null; return; }
    const all = lang.script.items.map((_, i) => i).filter(i => i !== cq.cur);
    cq.opts = shuffle([cq.cur].concat(shuffle(all).slice(0, 3)));
  }
  function renderCharQuiz() {
    const lang = L(cur), it = lang.script.items[cq.cur];
    return '<div class="t-meta"><span>' + esc(lang.script.title) + '</span><span>қолди: ' + (cq.queue.length + 1) + "</span></div>" +
      '<div class="t-card"><div class="t-ask">Бу белги қандай ўқилади?</div>' +
      '<div class="t-word ' + lang.id + '">' + esc(it[0]) + "</div></div>" +
      '<div class="t-opts">' + cq.opts.map((i, k) => {
        let cls = "t-opt";
        if (cq.answered) { if (i === cq.cur) cls += " right"; else if (i === cq.picked) cls += " wrong"; }
        return '<button class="' + cls + '" data-char="' + i + '"' + (cq.answered ? " disabled" : "") + ">" +
          '<span class="t-n">' + (k + 1) + "</span><span>" + esc(lang.script.items[i][2]) + "</span></button>";
      }).join("") + "</div>" +
      (cq.answered && !cq.ok ? '<p class="h-note" style="color:var(--red);text-align:center">Тўғри жавоб: ' +
        esc(it[2]) + " · мисол: " + esc(it[3]) + "</p>" : "") +
      '<div class="h-row" style="justify-content:center;margin-top:12px"><button class="h-link" data-act="back">Тўхтатиш</button></div>';
  }
  function answerChar(i) {
    if (cq.answered) return;
    cq.answered = true; cq.picked = i; cq.ok = i === cq.cur;
    const s = S(cur);
    if (cq.ok) { s.plan.script[cq.cur] = true; save(); }
    else cq.queue.push(cq.cur);
    render();
    setTimeout(() => {
      nextChar();
      if (!cq) planView = { type: "overview", month: planView.month, sel: planView.sel };
      render();
    }, cq && cq.ok ? 600 : 1400);
  }

  /* ---------- машқ ---------- */
  function pool() {
    const s = S(cur), lang = L(cur), t = todayIdx();
    if (session) {
      const day = dayOf(session.n), seen = new Set(), arr = [];
      const add = it => { if (it && !seen.has(it.id)) { seen.add(it.id); arr.push(it); } };
      day.items.forEach(id => { if (!learned(s, id)) add(lang.byId.get(id)); });
      lang.items.forEach(w => { const c = card(s, w.id); if (c && c.due <= t) add(w); });
      if (day.kind === "review" || !arr.length) lang.items.forEach(w => { if (card(s, w.id)) add(w); });
      if (!arr.length) day.items.forEach(id => add(lang.byId.get(id)));
      return arr.length ? arr : lang.items.slice();
    }
    const set = new Set(s.topics);
    return set.size ? lang.items.filter(w => set.has(w.topic)) : lang.items.slice();
  }
  function newQueue() {
    const s = S(cur), t = todayIdx();
    let p = pool();
    if (s.mode === "write" && L(cur).typeField !== "pron") {
      const only = p.filter(w => w.kind === "word");
      if (only.length) p = only;
    }
    if (session) { queue = shuffle(p.slice()); return next(); }
    const due = [], fresh = [], rest = [];
    p.forEach(w => { const c = card(s, w.id); if (!c) fresh.push(w); else if (c.due <= t) due.push(w); else rest.push(w); });
    shuffle(due); shuffle(fresh); shuffle(rest);
    queue = due.concat(fresh.slice(0, 12), rest.slice(0, 20));
    if (!queue.length) queue = shuffle(p).slice(0, 20);
    next();
  }
  function next() {
    if (!queue.length) { const p = pool(); queue = shuffle(p.slice()).slice(0, 30); }
    item = queue.shift() || null;
    shown = false; answered = false;
    if (item) delete item.opts;
  }

  function natBlock(it) {
    const lang = L(cur);
    const sm = it.kind === "phrase" ? " sm" : "";
    return '<div class="t-word ' + lang.id + sm + '"' + (lang.dir === "rtl" ? ' dir="rtl"' : "") + ">" + markStress(it.native) + "</div>" +
      (it.extra ? '<div class="t-extra">' + esc(it.extra) + "</div>" : "");
  }

  function renderDrill() {
    const s = S(cur), lang = L(cur);
    if (!item) newQueue();
    if (!item) return '<div class="h-empty">Сўз топилмади.</div>';
    const n2u = s.dir === "n2u";
    let h = "";
    if (session) {
      const day = dayOf(session.n), tasks = dayTasks(day);
      const lt = tasks.filter(t => t.key === "learn" || t.key === "rev")[0];
      const all = tasks.every(t => t.done);
      h += '<div class="t-planbar"><span>' + (all ? "✓ Кун " + day.n + " топшириқлари бажарилди"
        : "Кун " + day.n + " машқи" + (lt ? " · " + lt.a + "/" + lt.b : "")) + "</span>" +
        '<button class="h-btn sm' + (all ? " pri" : "") + '" data-act="toplan">Режага қайтиш</button></div>';
    } else {
      h += '<div class="t-chips">' +
        '<button class="t-chip" data-topic="*" aria-pressed="' + (!s.topics.length) + '">Ҳаммаси</button>' +
        lang.topics.concat([["ph", "Иборалар"]]).map(([id, nm]) =>
          '<button class="t-chip" data-topic="' + id + '" aria-pressed="' + (s.topics.indexOf(id) >= 0) + '">' + nm + "</button>").join("") +
        "</div>";
    }
    h += '<div class="t-tools"><div class="t-seg">' +
      [["flip", "Карточка"], ["choice", "Танлов"], ["write", "Ёзиш"], ["listen", "Эшитиш"]].map(([k, nm]) =>
        '<button data-mode="' + k + '" aria-pressed="' + (s.mode === k) + '">' + nm + "</button>").join("") + "</div>";
    if (s.mode === "flip" || s.mode === "choice") h += '<div class="t-seg">' +
      [["n2u", lang.code + " → ўзб"], ["u2n", "ўзб → " + lang.code]].map(([k, nm]) =>
        '<button data-dir="' + k + '" aria-pressed="' + (s.dir === k) + '">' + nm + "</button>").join("") + "</div>";
    h += "</div>";

    if (s.mode === "flip") {
      h += '<div class="t-card">' +
        '<div class="t-ask">' + (n2u ? "Бу нима дегани?" : "Бу тилда қандай айтилади?") + "</div>" +
        (n2u ? natBlock(item) + '<div class="t-say-row">' + sayBtn(item.native) + '<span class="t-pron">' + esc(item.pron) + "</span></div>"
             : '<div class="t-word uz' + (item.kind === "phrase" ? " sm" : "") + '">' + esc(item.uz) + "</div>") +
        (shown ? '<div class="t-answer">' +
          (n2u ? '<div class="t-val uz">' + esc(item.uz) + "</div>"
               : natBlock(item) + '<div class="t-say-row">' + sayBtn(item.native) + '<span class="t-pron">' + esc(item.pron) + "</span></div>") +
          '<div class="h-note">' + topicName(item) + "</div></div>" : "") +
        "</div>" +
        '<div class="h-row" style="justify-content:center;margin-top:16px">' + (shown
          ? '<button class="h-btn bad" data-g="0">Билмадим</button><button class="h-btn ok" data-g="1">Билдим</button>'
          : '<button class="h-btn pri" data-flip="1">Жавобни кўрсатиш</button>') + "</div>";
    }

    if (s.mode === "choice") {
      if (!item.opts) {
        const kin = lang.items.filter(w => w.kind === item.kind && w.id !== item.id);
        const same = kin.filter(w => w.topic === item.topic);
        item.opts = shuffle([item].concat(shuffle((same.length >= 3 ? same : kin).slice()).slice(0, 3)));
      }
      h += '<div class="t-card"><div class="t-ask">Тўғри жавобни танланг</div>' +
        (n2u ? natBlock(item) + '<div class="t-say-row">' + sayBtn(item.native) + "</div>"
             : '<div class="t-word uz' + (item.kind === "phrase" ? " sm" : "") + '">' + esc(item.uz) + "</div>") + "</div>" +
        '<div class="t-opts">' + item.opts.map((o, i) => {
          let cls = "t-opt";
          if (answered) { if (o.id === item.id) cls += " right"; else if (o.id === item.picked) cls += " wrong"; }
          return '<button class="' + cls + '" data-opt="' + o.id + '"' + (answered ? " disabled" : "") + ">" +
            '<span class="t-n">' + (i + 1) + "</span><span" + (n2u ? "" : ' class="t-nat ' + lang.id + '"') + ">" +
            (n2u ? esc(o.uz) : markStress(o.native)) + "</span></button>";
        }).join("") + "</div>";
    }

    if (s.mode === "write") {
      const field = lang.typeField === "pron" ? "pron" : "native";
      h += '<div class="t-card"><div class="t-ask">' +
        (field === "pron" ? "Талаффузини лотин/кирилл ҳарфлари билан ёзинг" : esc(lang.name) + "да ёзинг") + "</div>" +
        '<div class="t-word uz' + (item.kind === "phrase" ? " sm" : "") + '">' + esc(item.uz) + "</div>" +
        '<div class="h-note">' + topicName(item) + "</div>" +
        '<input class="t-in" id="t-in" autocomplete="off" autocapitalize="off" spellcheck="false"' +
        (H.TOUCH && lang.keys ? ' inputmode="none"' : "") + ' aria-label="Жавоб">' +
        '<div class="t-verdict" id="t-verdict"></div></div>';
      if (lang.keys) h += '<div class="t-keys">' + lang.keys.map(row =>
        '<div class="t-krow">' + row.split("").map(k => '<button class="t-key" data-k="' + esc(k) + '">' + esc(k) + "</button>").join("") + "</div>").join("") +
        '<div class="t-krow"><button class="t-key wide" data-k=" ">бўшлиқ</button>' +
        '<button class="t-key wide" data-k="⌫">ўчириш</button>' +
        '<button class="t-key wide" data-k="↵">текшириш</button></div></div>';
      h += '<div class="h-row" style="justify-content:center;margin-top:14px">' +
        '<button class="h-btn pri" data-act="check">' + (answered ? "Кейинги сўз" : "Текшириш") + "</button>" +
        '<button class="h-btn" data-act="skip">Кўрсатиб бер</button></div>';
    }

    if (s.mode === "listen") {
      const v = voiceFor(lang.speech);
      if (!item.opts) {
        const kin = lang.items.filter(w => w.kind === item.kind && w.id !== item.id);
        item.opts = shuffle([item].concat(shuffle(kin.slice()).slice(0, 3)));
      }
      h += '<div class="t-card"><div class="t-ask">Эшитинг ва тўғрисини танланг</div>' +
        '<button class="t-bigsay" data-say="' + esc(plain(item.native)) + '">' + SPK + "</button>" +
        (v ? "" : '<p class="h-note" style="color:var(--red)">Бу қурилмада ' + esc(lang.name) +
          ' учун овоз ўрнатилмаган — тизим созламаларидан овоз пакетини қўшиш керак.</p>') + "</div>" +
        '<div class="t-opts">' + item.opts.map((o, i) => {
          let cls = "t-opt";
          if (answered) { if (o.id === item.id) cls += " right"; else if (o.id === item.picked) cls += " wrong"; }
          return '<button class="' + cls + '" data-opt="' + o.id + '"' + (answered ? " disabled" : "") + ">" +
            '<span class="t-n">' + (i + 1) + '</span><span class="t-nat ' + lang.id + '">' + markStress(o.native) +
            '</span><span class="t-pron">' + esc(o.uz) + "</span></button>";
        }).join("") + "</div>";
    }
    return h;
  }
  function topicName(it) {
    const lang = L(cur);
    return it.kind === "phrase" ? "Иборалар · " + it.group
      : (lang.topics.filter(x => x[0] === it.topic)[0] || ["", ""])[1];
  }

  function norm(s, lang) {
    let v = plain(String(s)).toLowerCase().trim();
    v = v.normalize ? v.normalize("NFD").replace(/[̀-ͯ]/g, "") : v;
    v = v.replace(/[0-9]/g, "").replace(/[.,!?;:'"«»¿¡]/g, "").replace(/ё/g, "е").replace(/\s+/g, " ");
    return v.trim();
  }
  function checkWrite() {
    const lang = L(cur), s = S(cur);
    if (answered) { next(); render(); return; }
    const inp = el.querySelector("#t-in");
    if (!inp) return;
    const field = lang.typeField === "pron" ? "pron" : "native";
    const ok = norm(inp.value, lang) === norm(item[field], lang);
    answered = true;
    grade(item.id, ok);
    const v = el.querySelector("#t-verdict");
    v.className = "t-verdict " + (ok ? "ok" : "no");
    v.innerHTML = ok ? "Тўғри! " + '<span class="t-nat ' + lang.id + '">' + markStress(item.native) + "</span>"
      : "Тўғриси: " + '<span class="t-nat ' + lang.id + '">' + markStress(item.native) + "</span> " +
        '<span class="t-pron">(' + esc(item.pron) + ")</span>";
    const b = el.querySelector('[data-act="check"]');
    if (b) b.textContent = "Кейинги сўз";
  }

  /* ---------- луғат / иборалар / ёзув / грамматика ---------- */
  function dots(id) {
    const s = S(cur), c = card(s, id), lvl = c ? c.box : 0;
    let h = "";
    for (let i = 1; i <= 5; i++) h += '<i class="t-dot' + (i <= lvl ? " on" : "") + '"></i>';
    return h;
  }
  function renderVocab() {
    const lang = L(cur);
    const q = norm(search, lang);
    let h = '<input class="t-search" id="t-search" type="search" placeholder="Сўз излаш…" aria-label="Излаш" value="' + esc(search) + '">';
    let found = 0;
    lang.topics.forEach(([tid, nm]) => {
      const list = lang.items.filter(w => w.topic === tid &&
        (!q || norm(w.native, lang).indexOf(q) >= 0 || norm(w.pron, lang).indexOf(q) >= 0 || norm(w.uz, lang).indexOf(q) >= 0));
      if (!list.length) return;
      found += list.length;
      h += '<div class="t-group"><h4>' + esc(nm) + " <em>" + list.length + "</em></h4>" +
        list.map(w => '<div class="t-row">' +
          '<div class="t-r-nat">' + sayBtn(w.native) + '<span class="t-nat ' + lang.id + '"' +
          (lang.dir === "rtl" ? ' dir="rtl"' : "") + ">" + markStress(w.native) + "</span></div>" +
          '<div class="t-pron">' + esc(w.pron) + (w.extra ? ' <i>' + esc(w.extra) + "</i>" : "") + "</div>" +
          '<div class="t-r-uz">' + esc(w.uz) + "</div>" +
          '<div class="t-lvl">' + dots(w.id) + "</div></div>").join("") + "</div>";
    });
    if (!found) h += '<div class="h-empty">Бундай сўз топилмади.</div>';
    return h;
  }
  function renderPhrase() {
    const lang = L(cur);
    const groups = {};
    lang.items.filter(w => w.kind === "phrase").forEach(p => { (groups[p.group] = groups[p.group] || []).push(p); });
    const keys = Object.keys(groups);
    if (!keys.length) return '<div class="h-empty">Иборалар киритилмаган.</div>';
    return keys.map(g => '<div class="t-group"><h4>' + esc(g) + " <em>" + groups[g].length + "</em></h4>" +
      groups[g].map(p => '<div class="t-phrase"><div class="t-p-nat">' + sayBtn(p.native) +
        '<span class="t-nat ' + lang.id + '"' + (lang.dir === "rtl" ? ' dir="rtl"' : "") + ">" + markStress(p.native) + "</span>" +
        '<span class="t-lvl">' + dots(p.id) + "</span></div>" +
        '<div class="t-pron">' + esc(p.pron) + (p.extra ? ' <i>' + esc(p.extra) + "</i>" : "") + "</div>" +
        '<div class="t-p-uz">' + esc(p.uz) + "</div></div>").join("") + "</div>").join("");
  }
  function renderScript() {
    const lang = L(cur), s = S(cur);
    if (!lang.script) return '<div class="h-empty">Бу тил лотин ёзувидан фойдаланади.</div>';
    const done = Object.keys(s.plan.script).length;
    return '<h3 class="t-mtitle">' + esc(lang.script.title) + "</h3>" +
      '<p class="h-note" style="margin:-2px 0 12px">' + esc(lang.script.note || "") +
      " · " + done + "/" + lang.script.items.length + " белги ёдланган</p>" +
      '<div class="t-scripts">' + lang.script.items.map((it, i) =>
        '<div class="t-sc' + (s.plan.script[i] ? " ok" : "") + '">' +
        '<b class="' + lang.id + '">' + esc(it[0]) + "</b>" +
        "<span>" + esc(it[2]) + "</span>" +
        '<em class="' + lang.id + '">' + esc(it[3]) + "</em>" +
        "<i>" + esc(it[4] || "") + "</i>" +
        sayBtn(it[3]) + "</div>").join("") + "</div>";
  }
  function renderGram() {
    const lang = L(cur), s = S(cur);
    return lang.grammar.map((g, i) => '<div class="t-gcard" id="tg' + i + '"><h4>' + esc(g.t) + "</h4>" + g.h +
      '<div class="t-gdone"><button class="h-btn sm' + (s.plan.gram[i] ? " ok" : "") + '" data-gram="' + i + '">' +
      (s.plan.gram[i] ? "✓ Тушундим" : "Тушундим") + "</button>" +
      '<span class="h-note">' + (s.plan.gram[i] ? "режада белгиланди" : "ўқиб бўлгач белгиланг") + "</span></div></div>").join("");
  }

  /* ================= ҳодисалар ================= */
  function onInput(e) {
    const s = e.target.closest("#t-search");
    if (s) {
      search = s.value;
      const box = el.querySelector(".t-body");
      if (box) { box.innerHTML = renderVocab(); const inp = el.querySelector("#t-search"); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
    }
  }
  function onKey(e) {
    if (e.key === "Enter" && e.target.id === "t-in") { e.preventDefault(); checkWrite(); }
  }

  function onClick(e) {
    const s = cur ? S(cur) : null;
    const lg = e.target.closest("[data-lang]");
    if (lg) {
      cur = lg.dataset.lang; data().cur = cur; save();
      view = "course"; tab = "plan"; planView = { type: "overview", month: null, sel: null };
      session = null; item = null; queue = [];
      render(); H.emit("today"); return;
    }
    const tb = e.target.closest("[data-tab]");
    if (tb) { tab = tb.dataset.tab; if (tab === "drill" && !item) newQueue(); render(); return; }
    const mo = e.target.closest("[data-month]");
    if (mo) { planView.month = +mo.dataset.month; planView.sel = null; render(); return; }
    const dc = e.target.closest("[data-day].t-dcell");
    if (dc) { planView.sel = +dc.dataset.day; render(); return; }
    const ex = e.target.closest("[data-exam]");
    if (ex) { answerExam(ex.dataset.exam); return; }
    const ch = e.target.closest("[data-char]");
    if (ch) { answerChar(+ch.dataset.char); return; }
    const md = e.target.closest("[data-mode]");
    if (md) { s.mode = md.dataset.mode; save(); item = null; queue = []; newQueue(); render(); return; }
    const dr = e.target.closest("[data-dir]");
    if (dr) { s.dir = dr.dataset.dir; save(); render(); return; }
    const tp = e.target.closest("[data-topic]");
    if (tp) {
      const id = tp.dataset.topic;
      if (id === "*") s.topics = [];
      else { const i = s.topics.indexOf(id); if (i >= 0) s.topics.splice(i, 1); else s.topics.push(id); }
      save(); queue = []; newQueue(); render(); return;
    }
    if (e.target.closest("[data-flip]")) { shown = true; render(); return; }
    const g = e.target.closest("[data-g]");
    if (g) { grade(item.id, g.dataset.g === "1"); next(); render(); return; }
    const op = e.target.closest("[data-opt]");
    if (op && !answered) {
      answered = true; item.picked = op.dataset.opt;
      const ok = op.dataset.opt === item.id;
      grade(item.id, ok);
      render();
      setTimeout(() => { next(); render(); }, ok ? 600 : 1400);
      return;
    }
    const k = e.target.closest("[data-k]");
    if (k) {
      const inp = el.querySelector("#t-in"); if (!inp) return;
      const ch2 = k.dataset.k;
      if (ch2 === "⌫") inp.value = inp.value.slice(0, -1);
      else if (ch2 === "↵") checkWrite();
      else inp.value += ch2;
      inp.focus(); return;
    }
    const gr = e.target.closest("[data-gram]");
    if (gr) {
      const i = +gr.dataset.gram;
      if (s.plan.gram[i]) delete s.plan.gram[i]; else s.plan.gram[i] = true;
      save(); render(); return;
    }
    const a = e.target.closest("[data-act]");
    if (!a) return;
    const act = a.dataset.act;
    if (act === "pick") { view = "pick"; session = null; render(); return; }
    if (act === "drill") {
      const n = a.dataset.day ? +a.dataset.day : curN();
      session = { n }; tab = "drill"; queue = []; item = null; newQueue(); render(); return;
    }
    if (act === "toplan") { session = null; tab = "plan"; planView = { type: "overview", month: null, sel: null }; queue = []; item = null; render(); return; }
    if (act === "chars") { startChars(dayOf(a.dataset.day ? +a.dataset.day : curN())); return; }
    if (act === "exam") { startExam(dayOf(a.dataset.day ? +a.dataset.day : curN())); return; }
    if (act === "qexam") { startExam("quarter"); return; }
    if (act === "retry") { startExam(exam.id === "q1" ? "quarter" : dayOf(curN())); return; }
    if (act === "back") { exam = null; cq = null; planView = { type: "overview", month: planView.month, sel: planView.sel }; render(); return; }
    if (act === "check") { checkWrite(); return; }
    if (act === "skip") {
      if (!answered) {
        answered = true; grade(item.id, false);
        const v = el.querySelector("#t-verdict");
        if (v) { v.className = "t-verdict no"; v.innerHTML = "Тўғриси: <span class='t-nat " + cur + "'>" + markStress(item.native) + "</span> <span class='t-pron'>(" + esc(item.pron) + ")</span>"; }
        const b = el.querySelector('[data-act="check"]'); if (b) b.textContent = "Кейинги сўз";
      } else { next(); render(); }
      return;
    }
    if (act.indexOf("gram:") === 0) { tab = "gram"; render(); const n = el.querySelector("#tg" + act.slice(5)); if (n) setTimeout(() => n.scrollIntoView({ behavior: "smooth", block: "center" }), 60); return; }
    if (act === "next") {
      const day = dayOf(curN());
      if (!dayComplete(day)) return;
      s.plan.finished[day.n] = new Date().toLocaleDateString("ru-RU");
      s.plan.day = Math.min(curN() + 1, LAST() + 1);
      planView = { type: "overview", month: null, sel: null };
      session = null; save(); render(); H.emit("today");
    }
  }
})(window.H);
