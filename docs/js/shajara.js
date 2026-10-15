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

  let tab = "tree", editing = null, preset = null;

  H.shajaraCount = () => data().people.length;

  H.mod({
    id: NS, title: "Шажара",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); el.addEventListener("change", onChange); },
    show(el) { render(el); }
  });

  function node(p, seen) {
    const d = data();
    const sp = p.spouseId ? person(p.spouseId) : null;
    const kids = childrenOf(p.id).filter(k => !seen.has(k.id));
    kids.forEach(k => seen.add(k.id));
    const isSelf = d.selfId === p.id;
    return '<li><div class="s-node' + (isSelf ? " self" : "") + '" data-p="' + p.id + '">' +
      '<b class="' + (p.gender === "f" ? "f" : "m") + '">' + H.esc(p.name) + '</b>' +
      (years(p) ? '<span class="s-yr">' + years(p) + '</span>' : '') +
      (sp ? '<span class="s-sp">⚭ ' + H.esc(sp.name) + '</span>' : '') +
      (isSelf ? '<span class="s-me">мен</span>' : '') +
      '</div>' +
      (kids.length ? '<ul>' + kids.map(k => node(k, seen)).join("") + '</ul>' : '') +
      '</li>';
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
        '</select></div></div>';
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
          return '<div class="h-item"><span class="ttl">' + H.esc(p.name) +
            '<span class="sub">' + (years(p) || "сана йўқ") +
            (f ? " · отаси: " + H.esc(f.name) : "") + (m ? " · онаси: " + H.esc(m.name) : "") + '</span></span>' +
            '<button class="h-link" data-edit="' + p.id + '">таҳрир</button>' +
            '<button class="h-link" data-del="' + p.id + '">ўчириш</button></div>';
        }).join("") + '</div></div>';
    }

    if (tab === "add") h += '<div class="h-card" data-m="shajara"><div class="h-card-h"><h3>' +
      (editing ? "Маълумотни таҳрирлаш" : "Янги одам") + '</h3></div>' + form() + '</div>';

    el.innerHTML = h;
  }

  function depth(id, seen) {
    seen = seen || new Set();
    if (seen.has(id)) return 0;
    seen.add(id);
    const kids = childrenOf(id);
    if (!kids.length) return 1;
    return 1 + Math.max.apply(null, kids.map(k => depth(k.id, seen)));
  }

  function form() {
    const d = data();
    const p = editing || preset || {};
    const opts = (sel, gender) => '<option value="">— йўқ —</option>' + d.people
      .filter(x => x.id !== p.id && (!gender || x.gender === gender))
      .map(x => '<option value="' + x.id + '"' + (x.id === sel ? " selected" : "") + '>' + H.esc(x.name) + '</option>').join("");
    return '<form data-form="p" class="h-form">' +
      '<input type="hidden" name="id" value="' + (p.id || "") + '">' +
      '<div class="h-field wide"><label>Исми, фамилияси</label><input class="h-in" name="name" required value="' + H.esc(p.name || "") + '"></div>' +
      '<div class="h-field"><label>Жинси</label><select class="h-in" name="gender">' +
      '<option value="m"' + (p.gender !== "f" ? " selected" : "") + '>Эркак</option>' +
      '<option value="f"' + (p.gender === "f" ? " selected" : "") + '>Аёл</option></select></div>' +
      '<div class="h-field"><label>Туғилган йили</label><input class="h-in" name="birth" placeholder="1952 ёки 1952-04-10" value="' + H.esc(p.birth || "") + '"></div>' +
      '<div class="h-field"><label>Вафот йили</label><input class="h-in" name="death" placeholder="2014" value="' + H.esc(p.death || "") + '"></div>' +
      '<div class="h-field"><label>Отаси</label><select class="h-in" name="fatherId">' + opts(p.fatherId, "m") + '</select></div>' +
      '<div class="h-field"><label>Онаси</label><select class="h-in" name="motherId">' + opts(p.motherId, "f") + '</select></div>' +
      '<div class="h-field"><label>Турмуш ўртоғи</label><select class="h-in" name="spouseId">' + opts(p.spouseId) + '</select></div>' +
      '<div class="h-field wide"><label>Эслатма</label><input class="h-in" name="note" value="' + H.esc(p.note || "") + '" placeholder="Касби, туғилган жойи, эсда қолган гапи…"></div>' +
      '<div class="h-field wide h-row"><button class="h-btn pri">' + (editing ? "Сақлаш" : "Қўшиш") + '</button>' +
      ((editing || preset) ? '<button type="button" class="h-btn sm" data-cancel="1">Бекор</button>' : '') + '</div></form>';
  }

  function onChange(e) {
    const r = e.target.closest("[data-root]");
    if (r) { const d = data(); d.rootId = r.value; H.store.save(NS); render(e.currentTarget); }
  }

  function onClick(e) {
    const el = e.currentTarget, d = data();
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; if (tab !== "add") { editing = null; preset = null; } render(el); return; }
    const ed = e.target.closest("[data-edit]");
    if (ed) { editing = person(ed.dataset.edit); preset = null; tab = "add"; render(el); return; }
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
    if (e.target.closest("[data-cancel]")) { editing = null; preset = null; render(el); return; }
    const nd = e.target.closest("[data-p]");
    if (nd) { openNode(el, nd.dataset.p); return; }
  }

  function openNode(el, id) {
    const d = data(), p = person(id);
    if (!p) return;
    const box = document.createElement("div");
    box.className = "n-sheet";
    box.innerHTML = '<div class="n-sheet-in"><div class="h-card-h"><h3>' + H.esc(p.name) + '</h3>' +
      '<button class="h-link" data-close="1">ёпиш</button></div>' +
      '<p class="h-note">' + (years(p) || "сана кўрсатилмаган") + (p.note ? " · " + H.esc(p.note) : "") + '</p>' +
      '<div class="h-row" style="margin-top:12px">' +
      '<button class="h-btn sm" data-x="child">Фарзанд қўшиш</button>' +
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
      if (x === "child") { preset = p.gender === "f" ? { motherId: id } : { fatherId: id }; editing = null; tab = "add"; render(el); }
      if (x === "edit") { editing = p; preset = null; tab = "add"; render(el); }
      if (x === "self") { d.selfId = d.selfId === id ? "" : id; H.store.save(NS); render(el); }
      if (x === "root") { d.rootId = id; H.store.save(NS); tab = "tree"; render(el); }
    });
    document.body.appendChild(box);
  }

  function onSubmit(e) {
    e.preventDefault();
    const el = e.currentTarget, d = data(), f = e.target;
    const val = n => (f.elements[n] ? String(f.elements[n].value).trim() : "");
    const rec = {
      name: val("name"), gender: val("gender"), birth: val("birth"), death: val("death"),
      fatherId: val("fatherId"), motherId: val("motherId"), spouseId: val("spouseId"), note: val("note")
    };
    if (!rec.name) return;
    const id = val("id");
    if (id) Object.assign(person(id), rec);
    else {
      rec.id = H.id();
      d.people.push(rec);
      if (rec.spouseId) { const sp = person(rec.spouseId); if (sp && !sp.spouseId) sp.spouseId = rec.id; }
      if (!d.people.length) d.rootId = rec.id;
    }
    editing = null; preset = null; tab = "tree";
    H.store.save(NS); render(el);
  }
})(window.H);
