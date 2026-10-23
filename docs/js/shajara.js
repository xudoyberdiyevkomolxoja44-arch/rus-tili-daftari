/* ============ Шажара ============
   Аждодлар дарахти: ҳар бир киши отаси/онаси орқали боғланади.
   Дарахт энг юқоридаги аждоддан пастга қараб чизилади. */
(function (H) {
  const NS = "shajara";
  const DEF = { people: [], selfId: "", rootId: "" };

  H.store.get(NS, DEF);          /* бошланғич қийматни дарҳол рўйхатдан ўтказамиз */
  const data = () => H.store.get(NS, DEF);
  const person = id => data().people.filter(p => p.id === id)[0];
  const childrenOf = id => data().people.filter(p => p.fatherId === id || p.motherId === id);
  /* энг юқоридаги аждодни топиш */
  function topAncestor(id) {
    const seen = new Set();
    let cur = person(id);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      const up = (cur.fatherId && person(cur.fatherId)) || (cur.motherId && person(cur.motherId));
      if (!up) break;
      cur = up;
    }
    return cur ? cur.id : id;
  }

  const roots = () => {
    const d = data();
    const r = d.people.filter(p => !p.fatherId && !p.motherId);
    return r.length ? r : d.people.slice(0, 1);
  };
  const years = p => {
    const a = (p.birth || "").slice(0, 4), b = (p.death || "").slice(0, 4);
    if (!a && !b) return "";
    return (a || "?") + (b ? " – " + b : "");
  };

  /* сана: "1991", "1991-04" ёки "1991-04-10" кўринишида сақланади */
  const dparts = v => { const p = String(v || "").split("-"); return { y: p[0] || "", m: p[1] || "", d: p[2] || "" }; };
  function dmake(y, m, d) {
    y = String(y || "").trim().replace(/[^0-9]/g, "");
    m = String(m || "").trim(); d = String(d || "").trim().replace(/[^0-9]/g, "");
    if (!y) return "";
    if (!m) return y;
    if (!d) return y + "-" + H.pad(+m);
    return y + "-" + H.pad(+m) + "-" + H.pad(+d);
  }
  function fmtFull(v) {
    const p = dparts(v);
    if (!p.y) return "";
    if (!p.m) return p.y;
    const mn = H.MONTHS[(+p.m) - 1] || p.m;
    return (p.d ? (+p.d) + "-" : "") + mn + " " + p.y;
  }
  H.shajaraDates = function () {
    /* тўлиқ санаси маълум одамлар — Оила бўлимидаги «яқин саналар» учун */
    return data().people.filter(p => { const x = dparts(p.birth); return x.y && x.m && x.d && !p.death; })
      .map(p => ({ name: p.name, date: p.birth }));
  };

  let tab = "tree", editing = null, preset = null;
  let parentFor = null;  // {childId, role} — янги одам кимнинг ота-онаси бўлиши
  let photoBuf = null;   // null — ўзгармаган, "" — ўчирилган, "data:…" — янги сурат

  /* суратни квадрат қилиб кичрайтирамиз — хотирани шишириб юбормаслик учун */
  function readPhoto(file, cb) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      const S = 180;
      const c = document.createElement("canvas");
      c.width = S; c.height = S;
      const ctx = c.getContext("2d");
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      URL.revokeObjectURL(url);
      let out = "";
      try { out = c.toDataURL("image/jpeg", 0.72); } catch (e) {}
      cb(out);
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(""); };
    img.src = url;
  }

  H.shajaraCount = () => data().people.length;

  H.mod({
    id: NS, title: "Шажара",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); el.addEventListener("change", onChange); },
    show(el) { render(el); }
  });

  /* Сурат ёки бош ҳарф — барча жойда бир хил кўринади */
  function avatar(x, cls) {
    const letter = (String(x.name || "?").trim()[0] || "?").toUpperCase();
    return '<span class="s-ava ' + (cls || "") + (x.gender === "f" ? " f" : "") + '">' +
      (x.photo ? '<img src="' + x.photo + '" alt="">' : '<i>' + H.esc(letter) + '</i>') + '</span>';
  }

  /* Битта карточка: 1/3 сурат, 2/3 ФИШ. Ўлчами ҳамма жойда бир хил. */
  function card(x) {
    const d = data();
    const isSelf = d.selfId === x.id;
    return '<div class="s-node' + (isSelf ? " self" : "") + '" data-p="' + x.id + '">' +
      avatar(x) +
      '<span class="s-info">' +
        '<b class="' + (x.gender === "f" ? "f" : "m") + '">' + H.esc(x.name) + '</b>' +
        (years(x) ? '<span class="s-yr">' + years(x) + '</span>' : '') +
        (isSelf ? '<span class="s-me">мен</span>' : '') +
      '</span></div>';
  }

  /* Эр-хотин ёнма-ён, фарзандлар иккаласининг тагида */
  function node(p, seen) {
    const sp = (p.spouseId && !seen.has(p.spouseId)) ? person(p.spouseId) : null;
    if (sp) seen.add(sp.id);

    const picked = new Set(), kids = [];
    const take = who => childrenOf(who.id).forEach(k => {
      if (!seen.has(k.id) && !picked.has(k.id)) { picked.add(k.id); kids.push(k); }
    });
    take(p);
    if (sp) take(sp);
    kids.sort((a, b) => String(a.birth || "9999").localeCompare(String(b.birth || "9999")));
    kids.forEach(k => seen.add(k.id));

    let block;
    if (sp) {
      /* эркак чапда, аёл ўнгда турсин */
      const left = (p.gender === "f" && sp.gender !== "f") ? sp : p;
      const right = (left === p) ? sp : p;
      block = '<div class="s-pair">' + card(left) +
        '<span class="s-mar"><i>⚭</i></span>' + card(right) + '</div>';
    } else {
      block = card(p);
    }
    return '<li>' + block + (kids.length ? '<ul>' + kids.map(k => node(k, seen)).join("") + '</ul>' : '') + '</li>';
  }

  function render(el) {
    const d = data();
    let h = '<div class="h-seg" style="margin-bottom:16px">' +
      [["tree", "Дарахт"], ["list", "Рўйхат"], ["add", "Одам қўшиш"]]
        .map(([k, nm]) => '<button data-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + nm + '</button>').join("") +
      '</div>';

    if (!d.people.length) {
      h += '<div class="h-empty">Шажара бўш. Энг катта аждодингиздан бошланг: «Одам қўшиш» → исм, ота-онасини кейин улайсиз.</div>';
      if (tab !== "add") { el.innerHTML = h; return; }
    }

    if (tab === "tree" && d.people.length) {
      const rs = roots();
      const rootId = d.rootId && person(d.rootId) ? d.rootId : rs[0].id;
      h += '<div class="h-row" style="margin-bottom:12px">' +
        '<div class="h-field" style="flex:1;max-width:320px"><label>Кимдан бошлаб кўрсатилсин</label>' +
        '<select class="h-in" data-root="1">' + d.people.map(p =>
          '<option value="' + p.id + '"' + (p.id === rootId ? " selected" : "") + '>' + H.esc(p.name) + '</option>').join("") +
        '</select></div>' +
        '<button class="h-btn sm" data-act="top" style="align-self:flex-end">⤒ Энг юқоридан</button></div>';
      const seen = new Set([rootId]);
      h += '<div class="s-tree"><ul>' + node(person(rootId), seen) + '</ul></div>' +
        '<p class="h-note" style="margin-top:10px">Исмни босиб таҳрирлаш, фарзанд қўшиш ёки «мен» деб белгилаш мумкин. ' +
        'Дарахт кенг бўлса, ён томонга суриб кўринг.</p>';
      h += '<div class="h-stats" style="margin-top:16px">' +
        '<div class="h-stat"><b>' + d.people.length + '</b><span>жами одам</span></div>' +
        '<div class="h-stat"><b>' + rs.length + '</b><span>аждод шохи</span></div>' +
        '<div class="h-stat"><b>' + depth(rootId) + '</b><span>авлод</span></div></div>';
    }

    if (tab === "list" && d.people.length) {
      h += '<div class="h-card" data-m="shajara"><div class="h-list">' +
        d.people.slice().sort((a, b) => (a.birth || "9999") < (b.birth || "9999") ? -1 : 1).map(p => {
          const f = p.fatherId ? person(p.fatherId) : null, m = p.motherId ? person(p.motherId) : null;
          const sp = p.spouseId ? person(p.spouseId) : null;
          return '<div class="h-item">' + avatar(p, "sm") + '<span class="ttl">' + H.esc(p.name) +
            '<span class="sub">' + (fmtFull(p.birth) || "сана йўқ") +
            (fmtFull(p.death) ? " – " + fmtFull(p.death) : "") +
            (f ? " · отаси: " + H.esc(f.name) : "") + (m ? " · онаси: " + H.esc(m.name) : "") +
            (sp ? " · ⚭ " + H.esc(sp.name) : "") + '</span></span>' +
            '<button class="h-link" data-edit="' + p.id + '">таҳрир</button>' +
            '<button class="h-link" data-del="' + p.id + '">ўчириш</button></div>';
        }).join("") + '</div></div>';
    }

    if (tab === "add") h += '<div class="h-card" data-m="shajara"><div class="h-card-h"><h3>' +
      (editing ? "Маълумотни таҳрирлаш" : "Янги одам") + '</h3></div>' + form() + '</div>';

    el.innerHTML = h;

    /* дарахт экранга сиғмаса, «мен» катаги кўриниб турсин */
    const box = el.querySelector(".s-tree");
    if (box) {
      const me = box.querySelector(".s-node.self") || box.querySelector(".s-node");
      if (me && box.scrollWidth > box.clientWidth) {
        const a = box.getBoundingClientRect(), b = me.getBoundingClientRect();
        box.scrollLeft += (b.left - a.left) - box.clientWidth / 2 + b.width / 2;
      }
    }
  }

  function depth(id, seen) {
    seen = seen || new Set();
    if (seen.has(id)) return 0;
    seen.add(id);
    const p = person(id);
    const kids = childrenOf(id).slice();
    if (p && p.spouseId) {
      seen.add(p.spouseId);
      childrenOf(p.spouseId).forEach(k => { if (!kids.some(x => x.id === k.id)) kids.push(k); });
    }
    if (!kids.length) return 1;
    return 1 + Math.max.apply(null, kids.map(k => depth(k.id, seen)));
  }

  function dateField(label, name, val) {
    const v = dparts(val);
    return '<div class="h-field s-datefield"><label>' + label + '</label><div class="s-date">' +
      '<input class="h-in" name="' + name + 'Y" inputmode="numeric" maxlength="4" placeholder="йил" value="' + H.esc(v.y) + '">' +
      '<select class="h-in" name="' + name + 'M"><option value="">ой</option>' +
      H.MONTHS.map((nm, i) => '<option value="' + (i + 1) + '"' + ((+v.m) === i + 1 ? " selected" : "") + '>' + nm + '</option>').join("") +
      '</select>' +
      '<input class="h-in" name="' + name + 'D" inputmode="numeric" maxlength="2" placeholder="кун" value="' + H.esc(v.d ? String(+v.d) : "") + '">' +
      '</div></div>';
  }

  function form() {
    const d = data();
    const p = editing || preset || {};
    const opts = (sel, gender) => '<option value="">— йўқ —</option>' + d.people
      .filter(x => x.id !== p.id && (!gender || x.gender === gender))
      .map(x => '<option value="' + x.id + '"' + (x.id === sel ? " selected" : "") + '>' + H.esc(x.name) + '</option>').join("");
    const shot = (photoBuf !== null) ? photoBuf : (p.photo || "");
    return '<form data-form="p" class="h-form">' +
      '<input type="hidden" name="id" value="' + (p.id || "") + '">' +
      '<div class="h-field wide"><label>Сурат</label><div class="s-photo">' +
        avatar({ name: p.name || "?", gender: p.gender, photo: shot }, "big") +
        '<div class="h-row">' +
          '<button type="button" class="h-btn sm" data-photo="pick">' + (shot ? "Бошқа сурат" : "Сурат танлаш") + '</button>' +
          (shot ? '<button type="button" class="h-btn sm" data-photo="clear">Ўчириш</button>' : '') +
          '<input type="file" accept="image/*" id="s-file" hidden>' +
        '</div>' +
        '<p class="h-note" style="flex-basis:100%;margin:0">Сурат 180×180 қилиб кичрайтирилади ва қурилмада сақланади.</p>' +
      '</div></div>' +
      '<div class="h-field wide"><label>Исми, фамилияси, отасининг исми</label><input class="h-in" name="name" required value="' + H.esc(p.name || "") + '"></div>' +
      '<div class="h-field"><label>Жинси</label><select class="h-in" name="gender">' +
      '<option value="m"' + (p.gender !== "f" ? " selected" : "") + '>Эркак</option>' +
      '<option value="f"' + (p.gender === "f" ? " selected" : "") + '>Аёл</option></select></div>' +
      dateField("Туғилган санаси", "birth", p.birth) +
      dateField("Вафот этган санаси", "death", p.death) +
      '<div class="h-field"><label>Отаси</label><select class="h-in" name="fatherId">' + opts(p.fatherId, "m") + '</select></div>' +
      '<div class="h-field"><label>Онаси</label><select class="h-in" name="motherId">' + opts(p.motherId, "f") + '</select></div>' +
      '<div class="h-field"><label>Турмуш ўртоғи</label><select class="h-in" name="spouseId">' + opts(p.spouseId) + '</select></div>' +
      '<div class="h-field wide"><label>Эслатма</label><input class="h-in" name="note" value="' + H.esc(p.note || "") + '" placeholder="Касби, туғилган жойи, эсда қолган гапи…"></div>' +
      '<div class="h-field wide h-row"><button class="h-btn pri">' + (editing ? "Сақлаш" : "Қўшиш") + '</button>' +
      ((editing || preset) ? '<button type="button" class="h-btn sm" data-cancel="1">Бекор</button>' : '') + '</div></form>';
  }

  function onChange(e) {
    const el = e.currentTarget;
    const r = e.target.closest("[data-root]");
    if (r) { const d = data(); d.rootId = r.value; H.store.save(NS); render(el); return; }
    const f = e.target.closest("#s-file");
    if (f && f.files && f.files[0]) {
      readPhoto(f.files[0], src => {
        if (!src) { alert("Суратни ўқиб бўлмади."); return; }
        photoBuf = src;
        render(el);
      });
    }
  }

  function onClick(e) {
    const el = e.currentTarget, d = data();
    const ph = e.target.closest("[data-photo]");
    if (ph) {
      if (ph.dataset.photo === "pick") { const f = el.querySelector("#s-file"); if (f) f.click(); }
      else { photoBuf = ""; render(el); }
      return;
    }
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; photoBuf = null; parentFor = null; if (tab !== "add") { editing = null; preset = null; } render(el); return; }
    const ed = e.target.closest("[data-edit]");
    if (ed) { editing = person(ed.dataset.edit); preset = null; photoBuf = null; tab = "add"; render(el); return; }
    const dl = e.target.closest("[data-del]");
    if (dl) {
      const p = person(dl.dataset.del);
      if (!confirm(p.name + " шажарадан ўчирилсинми?")) return;
      d.people = d.people.filter(x => x.id !== p.id);
      d.people.forEach(x => {
        if (x.fatherId === p.id) x.fatherId = "";
        if (x.motherId === p.id) x.motherId = "";
        if (x.spouseId === p.id) x.spouseId = "";
      });
      if (d.selfId === p.id) d.selfId = "";
      if (d.rootId === p.id) d.rootId = "";
      H.store.save(NS); render(el); return;
    }
    if (e.target.closest("[data-cancel]")) { editing = null; preset = null; photoBuf = null; parentFor = null; render(el); return; }
    const top = e.target.closest('[data-act="top"]');
    if (top) {
      const d2 = data();
      const from = d2.selfId || d2.rootId || (d2.people[0] && d2.people[0].id);
      if (from) { d2.rootId = topAncestor(from); H.store.save(NS); render(el); }
      return;
    }
    const nd = e.target.closest("[data-p]");
    if (nd) { openNode(el, nd.dataset.p); return; }
  }

  function openNode(el, id) {
    const d = data(), p = person(id);
    if (!p) return;
    const box = document.createElement("div");
    box.className = "n-sheet";
    box.innerHTML = '<div class="n-sheet-in"><div class="h-card-h" style="align-items:flex-start">' +
      '<span class="h-row" style="gap:10px;flex-wrap:nowrap;align-items:center">' + avatar(p, "big") +
      '<h3 style="margin:0">' + H.esc(p.name) + '</h3></span>' +
      '<button class="h-link" data-close="1">ёпиш</button></div>' +
      '<p class="h-note">' +
        (fmtFull(p.birth) ? "Туғилган: " + fmtFull(p.birth) : "сана кўрсатилмаган") +
        (fmtFull(p.death) ? " · вафоти: " + fmtFull(p.death) : "") +
        (p.spouseId && person(p.spouseId) ? " · турмуш ўртоғи: " + H.esc(person(p.spouseId).name) : "") +
        (p.note ? " · " + H.esc(p.note) : "") + '</p>' +
      '<div class="h-row" style="margin-top:12px">' +
      (p.fatherId && person(p.fatherId) ? "" : '<button class="h-btn sm" data-x="father">Отасини қўшиш</button>') +
      (p.motherId && person(p.motherId) ? "" : '<button class="h-btn sm" data-x="mother">Онасини қўшиш</button>') +
      '<button class="h-btn sm" data-x="child">Фарзанд қўшиш</button>' +
      (p.spouseId && person(p.spouseId) ? "" : '<button class="h-btn sm" data-x="spouse">Турмуш ўртоғи қўшиш</button>') +
      '<button class="h-btn sm" data-x="edit">Таҳрирлаш</button>' +
      '<button class="h-btn sm" data-x="self">' + (d.selfId === id ? "«мен» белгисини олиш" : "«мен» деб белгилаш") + '</button>' +
      '<button class="h-btn sm" data-x="root">Шу ердан кўрсатиш</button>' +
      '</div></div>';
    box.addEventListener("click", ev => {
      if (ev.target === box || ev.target.closest("[data-close]")) { box.remove(); return; }
      const b = ev.target.closest("[data-x]");
      if (!b) return;
      const x = b.dataset.x;
      box.remove();
      if (x === "child") {
        preset = p.gender === "f" ? { motherId: id } : { fatherId: id };
        const sp = p.spouseId ? person(p.spouseId) : null;
        if (sp) { if (sp.gender === "f") preset.motherId = sp.id; else preset.fatherId = sp.id; }
        editing = null; photoBuf = null; tab = "add"; render(el);
      }
      if (x === "spouse") {
        preset = { spouseId: id, gender: p.gender === "f" ? "m" : "f" };
        editing = null; photoBuf = null; tab = "add"; render(el);
      }
      if (x === "father" || x === "mother") {
        /* янги одам шу кишининг отаси/онаси бўлиб қўшилади */
        parentFor = { childId: id, role: x };
        preset = { gender: x === "father" ? "m" : "f" };
        const other = x === "father" ? (p.motherId && person(p.motherId)) : (p.fatherId && person(p.fatherId));
        if (other) preset.spouseId = other.id;      // иккинчи ота-она бўлса — дарҳол эр-хотин қилиб улаймиз
        editing = null; photoBuf = null; tab = "add"; render(el);
      }
      if (x === "edit") { editing = p; preset = null; photoBuf = null; tab = "add"; render(el); }
      if (x === "self") { d.selfId = d.selfId === id ? "" : id; H.store.save(NS); render(el); }
      if (x === "root") { d.rootId = id; H.store.save(NS); tab = "tree"; render(el); }
    });
    document.body.appendChild(box);
  }

  function onSubmit(e) {
    e.preventDefault();
    const el = e.currentTarget, d = data(), f = e.target;
    const val = n => (f.elements[n] ? String(f.elements[n].value).trim() : "");
    const base = editing || preset || {};
    const rec = {
      photo: (photoBuf !== null) ? photoBuf : (base.photo || ""),
      name: val("name"), gender: val("gender"),
      birth: dmake(val("birthY"), val("birthM"), val("birthD")),
      death: dmake(val("deathY"), val("deathM"), val("deathD")),
      fatherId: val("fatherId"), motherId: val("motherId"), spouseId: val("spouseId"), note: val("note")
    };
    if (!rec.name) return;
    const id = val("id");
    const wasFather = id ? (person(id).fatherId || "") : "";
    const wasMother = id ? (person(id).motherId || "") : "";
    if (id) Object.assign(person(id), rec);
    else { rec.id = H.id(); d.people.push(rec); }
    const me = id || rec.id;
    const self = person(me);

    /* «Отасини/онасини қўшиш» орқали келинган бўлса — фарзандга улаймиз */
    let movedUp = false;
    if (parentFor && !id) {
      const kid = person(parentFor.childId);
      if (kid) {
        kid[parentFor.role === "father" ? "fatherId" : "motherId"] = me;
        const otherId = parentFor.role === "father" ? kid.motherId : kid.fatherId;
        if (otherId && otherId !== me) {
          const other = person(otherId);
          if (other) { self.spouseId = otherId; other.spouseId = me; }
        }
        movedUp = true;
      }
    }
    parentFor = null;

    /* турмуш ўртоғи икки томонлама боғланади */
    const spId = self.spouseId;
    if (spId) { const sp = person(spId); if (sp && sp.spouseId !== me) sp.spouseId = me; }
    d.people.forEach(x => { if (x.id !== me && x.spouseId === me && spId !== x.id) x.spouseId = ""; });

    /* ота-она ўзгарган бўлса, дарахтни энг юқори аждоддан кўрсатамиз */
    if (movedUp || (id && (self.fatherId !== wasFather || self.motherId !== wasMother))) {
      d.rootId = topAncestor(me);
    }

    editing = null; preset = null; photoBuf = null; tab = "tree";
    H.store.save(NS); render(el);
  }
})(window.H);
