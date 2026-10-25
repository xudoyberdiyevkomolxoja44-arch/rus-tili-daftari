/* ============ Shajara ============
   Ajdodlar daraxti: har bir kishi otasi/onasi orqali bogʻlanadi.
   Daraxt eng yuqoridagi ajdoddan pastga qarab chiziladi. */
(function (H) {
  const NS = "shajara";
  const DEF = { people: [], selfId: "", rootId: "" };

  H.store.get(NS, DEF);          /* boshlangʻich qiymatni darhol roʻyxatdan oʻtkazamiz */
  const data = () => H.store.get(NS, DEF);
  const person = id => data().people.filter(p => p.id === id)[0];
  const childrenOf = id => data().people.filter(p => p.fatherId === id || p.motherId === id);
  /* eng yuqoridagi ajdodni topish */
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


  /* ============ Qarindoshlik atamasi ============
     «men» deb belgilangan kishiga nisbatan hisoblanadi.
     Aka/uka va opa/singil tugʻilgan yiliga qarab ajratiladi. */
  function relTo(x) {
    const d = data();
    const me = d.selfId ? person(d.selfId) : null;
    if (!me || !x || x.id === me.id) return "";
    const isF = p => p.gender === "f";
    const sib = (a, b) => !!a && !!b && a.id !== b.id &&
      ((a.fatherId && a.fatherId === b.fatherId) || (a.motherId && a.motherId === b.motherId));
    const older = (a, b) => {                 // a, b dan kattami?
      const ab = String(a.birth || ""), bb = String(b.birth || "");
      if (!ab || !bb || ab === bb) return null;
      return ab < bb;
    };

    if (me.spouseId === x.id) return isF(x) ? "xotinim" : "erim";

    /* yuqoriga: ota-ona, bobo-buvi */
    const up = new Map();
    (function climb(p, lvl) {
      if (!p || lvl > 4) return;
      [p.fatherId, p.motherId].forEach(id => {
        const n = id && person(id);
        if (!n || up.has(n.id)) return;
        up.set(n.id, lvl);
        climb(n, lvl + 1);
      });
    })(me, 1);
    if (up.has(x.id)) {
      const l = up.get(x.id);
      if (l === 1) return isF(x) ? "onam" : "otam";
      if (l === 2) return isF(x) ? "buvim" : "bobom";
      return isF(x) ? "katta buvim" : "katta bobom";
    }

    /* pastga: farzand, nabira */
    const down = new Map();
    (function dive(p, lvl) {
      if (!p || lvl > 4) return;
      childrenOf(p.id).forEach(k => {
        if (down.has(k.id)) return;
        down.set(k.id, lvl);
        dive(k, lvl + 1);
      });
    })(me, 1);
    if (down.has(x.id)) {
      const l = down.get(x.id);
      if (l === 1) return isF(x) ? "qizim" : "oʻgʻlim";
      if (l === 2) return "nabiram";
      return "evaram";
    }

    /* aka-uka, opa-singil */
    if (sib(me, x)) {
      const o = older(x, me);
      if (o === null) return isF(x) ? "opa-singlim" : "aka-ukam";
      if (isF(x)) return o ? "opam" : "singlim";
      return o ? "akam" : "ukam";
    }

    const f = me.fatherId ? person(me.fatherId) : null;
    const m = me.motherId ? person(me.motherId) : null;
    if (sib(f, x)) return isF(x) ? "ammam" : "amakim";
    if (sib(m, x)) return isF(x) ? "xolam" : "togʻam";

    const mySibs = data().people.filter(p => sib(me, p));
    if (mySibs.some(sb => x.fatherId === sb.id || x.motherId === sb.id)) return "jiyanim";
    const spouseOfSib = mySibs.filter(sb => sb.spouseId === x.id)[0];
    if (spouseOfSib) return isF(spouseOfSib) ? "pochcham" : "yangam";

    const sp = me.spouseId ? person(me.spouseId) : null;
    if (sp) {
      if (sp.fatherId === x.id) return "qaynotam";
      if (sp.motherId === x.id) return "qaynonam";
      if (sib(sp, x)) return isF(x) ? "qayinsinglim" : "qaynim";
    }
    if (childrenOf(me.id).some(k => k.spouseId === x.id)) return isF(x) ? "kelinim" : "kuyovim";
    return "";
  }

  /* hozirgi yosh: «35 yosh 6 oy» */
  function ageText(p) {
    if (p.death) return "";
    const b = dparts(p.birth);
    if (!b.y) return "";
    const now = new Date();
    const by = +b.y, bm = +(b.m || 1), bd = +(b.d || 1);
    let y = now.getFullYear() - by;
    let m = (now.getMonth() + 1) - bm;
    if (now.getDate() < bd) m--;
    if (m < 0) { y--; m += 12; }
    if (y < 0 || y > 140) return "";
    return y + " yosh" + (m ? " " + m + " oy" : "");
  }

  /* sana: "1991", "1991-04" yoki "1991-04-10" koʻrinishida saqlanadi */
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
    /* toʻliq sanasi maʼlum odamlar — Oila boʻlimidagi «yaqin sanalar» uchun */
    return data().people.filter(p => { const x = dparts(p.birth); return x.y && x.m && x.d && !p.death; })
      .map(p => ({ name: p.name, date: p.birth }));
  };

  let tab = "tree", editing = null, preset = null;
  let parentFor = null;  // {childId, role} — yangi odam kimning ota-onasi boʻlishi
  let photoBuf = null;   // null — oʻzgarmagan, "" — oʻchirilgan, "data:…" — yangi surat

  /* Suratni kvadrat qilib, aniqligini saqlagan holda kichraytiramiz.
     320×320 — telefon ekranida kattalashtirilganda ham tiniq koʻrinadi. */
  const PHOTO = 320, PHOTO_Q = 0.86;

  function photoCanvas(src) {
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    if (!w || !h) return null;
    const side = Math.min(w, h);
    const sx = (w - side) / 2, sy = (h - side) / 2;

    /* katta suratni birdaniga kichraytirsak donalanadi —
       shuning uchun ikki barobardan bosqichma-bosqich kichraytiramiz */
    let cur = document.createElement("canvas");
    let size = side;
    cur.width = size; cur.height = size;
    let cx = cur.getContext("2d");
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
    cx.drawImage(src, sx, sy, side, side, 0, 0, size, size);

    while (size > PHOTO * 2) {
      const next = document.createElement("canvas");
      const ns = Math.max(PHOTO, Math.round(size / 2));
      next.width = ns; next.height = ns;
      const nx = next.getContext("2d");
      nx.imageSmoothingEnabled = true; nx.imageSmoothingQuality = "high";
      nx.drawImage(cur, 0, 0, size, size, 0, 0, ns, ns);
      cur = next; size = ns;
    }
    if (size !== PHOTO) {
      const out = document.createElement("canvas");
      out.width = PHOTO; out.height = PHOTO;
      const ox = out.getContext("2d");
      ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = "high";
      ox.drawImage(cur, 0, 0, size, size, 0, 0, PHOTO, PHOTO);
      return out;
    }
    return cur;
  }

  function canvasToData(c) {
    return new Promise(res => {
      if (!c) return res("");
      const fallback = () => { try { res(c.toDataURL("image/jpeg", PHOTO_Q)); } catch (e) { res(""); } };
      if (!c.toBlob) return fallback();
      c.toBlob(bl => {
        if (!bl) return fallback();
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result || ""));
        fr.onerror = fallback;
        fr.readAsDataURL(bl);
      }, "image/jpeg", PHOTO_Q);
    });
  }

  async function readPhoto(file, cb) {
    if (window.createImageBitmap) {
      try {
        let bmp;
        try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
        catch (e) { bmp = await createImageBitmap(file); }
        const data = await canvasToData(photoCanvas(bmp));
        if (bmp && bmp.close) bmp.close();
        if (data) { cb(data); return; }
      } catch (e) {}
    }
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        canvasToData(photoCanvas(img)).then(data => { URL.revokeObjectURL(url); cb(data); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); cb(""); };
      img.src = url;
    } catch (e) { cb(""); }
  }

  H.shajaraCount = () => data().people.length;

  H.mod({
    id: NS, title: "Shajara",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); el.addEventListener("change", onChange); },
    show(el) { render(el); },
    /* orqaga: tahrir → daraxt, boshqa varaq → daraxt */
    back() {
      const el = document.getElementById("m-" + NS);
      if (!el) return false;
      if (editing || preset || parentFor) {
        editing = null; preset = null; parentFor = null; photoBuf = null; tab = "tree";
        render(el); return true;
      }
      if (tab !== "tree") { tab = "tree"; render(el); return true; }
      return false;
    }
  });

  /* Surat yoki bosh harf — barcha joyda bir xil koʻrinadi */
  function avatar(x, cls) {
    const letter = (String(x.name || "?").trim()[0] || "?").toUpperCase();
    return '<span class="s-ava ' + (cls || "") + (x.gender === "f" ? " f" : "") + '">' +
      (x.photo ? '<img src="' + x.photo + '" alt="">' : '<i>' + H.esc(letter) + '</i>') + '</span>';
  }

  /* Bitta kartochka: 1/3 surat, 2/3 FISH. Oʻlchami hamma joyda bir xil. */
  function card(x, left, top) {
    const d = data();
    const isSelf = d.selfId === x.id;
    const pos = (left === undefined) ? "" : ' style="left:' + left + 'px;top:' + top + 'px"';
    return '<div class="s-node' + (isSelf ? " self" : "") + '"' + pos + ' data-p="' + x.id + '">' +
      avatar(x) +
      '<span class="s-info">' +
        '<b class="' + (x.gender === "f" ? "f" : "m") + '">' + H.esc(x.name) + '</b>' +
        (years(x) ? '<span class="s-yr">' + years(x) +
          (ageText(x) ? ' · ' + ageText(x) : '') + '</span>' : '') +
        (isSelf ? '<span class="s-me">men</span>'
                : (relTo(x) ? '<span class="s-rel">' + relTo(x) + '</span>' : '')) +
      '</span></div>';
  }

  /* ============ Chizma: avlodlar boʻyicha joylashtirish ============
     Har bir juftlik (yoki yolgʻiz odam) — bitta «blok». Bloklar avlod
     qatorlariga teriladi, chiziqlar esa SVG bilan chiziladi. Shuning uchun
     har kimning ota-onasi aynan oʻzining katagiga ulanadi: erning
     ota-onasi erga, xotinniki xotinga. */
  let CW = 174, CH = 74, AV = 58, LINES = 3;
  let autoLines = 0;   // oʻlchab aniqlangan qator soni
  let fitPass = 0;     // oʻlchash urinishlari soni
  const MG = 16, GX = 24, GY = 52;

  /* Eng uzun FISH sigʻadigan qilib katak oʻlchamini tanlaymiz.
     Surat doim katakning uchdan birini egallaydi (AV * 3 = CW). */
  function setLines(lines) {
    LINES = Math.max(2, Math.min(8, lines));
    CH = LINES * 16 + 41; AV = CH - 16; CW = AV * 3;
  }
  function fitCard(people) {
    if (autoLines) { setLines(autoLines); return; }
    const maxLen = people.reduce((n, p) => Math.max(n, String(p.name || "").length), 0);
    for (let lines = 2; lines <= 6; lines++) {
      const ch = lines * 16 + 41, av = ch - 16, cw = av * 3;
      const cpl = Math.max(6, Math.floor((cw - 16 - av - 9) / 6.4));
      if (lines * cpl >= maxLen || lines === 6) { setLines(lines); return; }
    }
  }

  function buildChart(anchorId) {
    const d = data();
    const by = new Map(d.people.map(p => [p.id, p]));
    const start = by.get(anchorId) || d.people[0];
    if (!start) return null;
    fitCard(d.people);

    /* 1. Avlod raqamlari — markazdagi odamdan tarqab */
    const gen = new Map([[start.id, 0]]);
    const kidsOf = new Map();
    d.people.forEach(p => {
      [p.fatherId, p.motherId].forEach(pid => {
        if (!pid) return;
        if (!kidsOf.has(pid)) kidsOf.set(pid, []);
        kidsOf.get(pid).push(p);
      });
    });
    const queue = [start];
    while (queue.length) {
      const p = queue.shift(), g = gen.get(p.id);
      const step = (id, gg) => {
        const n = by.get(id);
        if (n && !gen.has(id)) { gen.set(id, gg); queue.push(n); }
      };
      if (p.spouseId && by.get(p.spouseId) && by.get(p.spouseId).spouseId === p.id) step(p.spouseId, g);
      if (p.fatherId) step(p.fatherId, g - 1);
      if (p.motherId) step(p.motherId, g - 1);
      (kidsOf.get(p.id) || []).forEach(k => step(k.id, g + 1));
    }

    /* 2. Bloklar */
    const unitOf = new Map(), units = [];
    d.people.forEach(p => {
      if (!gen.has(p.id) || unitOf.has(p.id)) return;
      const sp = (p.spouseId && by.get(p.spouseId) && by.get(p.spouseId).spouseId === p.id && gen.has(p.spouseId))
        ? by.get(p.spouseId) : null;
      let members;
      if (sp) {
        const left = (p.gender === "f" && sp.gender !== "f") ? sp : p;
        members = [left, left === p ? sp : p];
      } else members = [p];
      const u = {
        i: units.length, members, gen: gen.get(p.id),
        w: members.length > 1 ? CW * 2 + MG : CW,
        x: 0, up: [], down: []
      };
      units.push(u);
      members.forEach(m => unitOf.set(m.id, u));
    });
    if (!units.length) return null;

    /* 3. Ota-ona bogʻlari: qaysi blokdan qaysi katakka */
    const links = [];
    units.forEach(u => {
      u.members.forEach(m => {
        const fu = m.fatherId && unitOf.get(m.fatherId);
        const mu = m.motherId && unitOf.get(m.motherId);
        const seen = [];
        [[fu, m.fatherId], [mu, m.motherId]].forEach(([pu, pid]) => {
          if (!pu || seen.indexOf(pu) >= 0) return;
          seen.push(pu);
          const both = (fu === mu) && fu;
          const link = { pu, cu: u, childId: m.id, both: !!both, parentId: pid };
          links.push(link);
          u.up.push(link); pu.down.push(link);
        });
      });
    });

    /* 4. Qatorlar */
    let minG = Infinity, maxG = -Infinity;
    units.forEach(u => { minG = Math.min(minG, u.gen); maxG = Math.max(maxG, u.gen); });
    units.forEach(u => { u.row = u.gen - minG; });
    const rows = [];
    for (let r = 0; r <= maxG - minG; r++) rows.push(units.filter(u => u.row === r));

    /* 5. Chap-oʻng tartib: qarindoshlar yonma-yon, qudalar chetga.
       Turmush qurgan farzand aka-ukalarning chetida tursin — shunda
       xotin tomonning ota-onasi kesishmasdan yoniga joylashadi. */
    const key = u => u.members.map(m => m.birth || "9999").sort()[0];
    const anchorUnit = unitOf.get(start.id) || units[0];
    (function order() {
      const path = new Map();
      let top = anchorUnit, guard = 0;
      while (top.up.length && guard++ < 60) top = top.up[0].pu;
      const kidUnits = u => {
        const list = [];
        u.down.forEach(l => { if (list.indexOf(l.cu) < 0) list.push(l.cu); });
        list.sort((a, b) => {
          const sa = a.members.length > 1 ? 1 : 0, sb = b.members.length > 1 ? 1 : 0;
          if (sa !== sb) return sa - sb;
          return String(key(a)).localeCompare(String(key(b)));
        });
        return list;
      };
      const walk = (u, pth) => {
        if (path.has(u)) return;
        path.set(u, pth);
        kidUnits(u).forEach((k, i) => walk(k, pth + "." + (100 + i)));
      };
      walk(top, "500");
      for (let round = 0, moved = true; moved && round < 40; round++) {
        moved = false;
        units.forEach(u => {
          if (path.has(u)) return;
          const a = u.down.filter(l => path.has(l.cu))[0];
          if (a) { path.set(u, path.get(a.cu) + ".900"); moved = true; return; }
          const b = u.up.filter(l => path.has(l.pu))[0];
          if (b) { path.set(u, path.get(b.pu) + ".950"); moved = true; }
        });
      }
      units.forEach(u => { u.ord = path.get(u) || "999." + key(u); });
    })();

    rows.forEach(row => {
      row.sort((a, b) => a.ord.localeCompare(b.ord));
      let x = 0;
      row.forEach(u => { u.x = x + u.w / 2; x += u.w + GX; });
    });

    /* tartibni buzmasdan faqat ustma-ust tushganini surib qoʻyamiz */
    const pack = row => {
      for (let i = 1; i < row.length; i++) {
        const need = row[i - 1].x + row[i - 1].w / 2 + GX + row[i].w / 2;
        if (row[i].x < need) row[i].x = need;
      }
    };
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

    /* 6. Bolalar ota-ona ostiga, ota-ona bolalar ustiga */
    for (let it = 0; it < 24; it++) {
      for (let r = 1; r < rows.length; r++) {
        rows[r].forEach(u => { if (u.up.length) u.x = avg(u.up.map(l => anchorX(l.pu))); });
        pack(rows[r]);
      }
      for (let r = rows.length - 2; r >= 0; r--) {
        rows[r].forEach(u => { if (u.down.length) u.x = avg(u.down.map(l => memberX(l.cu, l.childId))); });
        pack(rows[r]);
      }
    }

    /* chapga suramiz */
    let minX = Infinity, maxX = -Infinity;
    units.forEach(u => { minX = Math.min(minX, u.x - u.w / 2); maxX = Math.max(maxX, u.x + u.w / 2); });
    units.forEach(u => { u.x -= minX - 8; });

    return {
      units, links, rows,
      width: Math.round(maxX - minX + 16),
      height: rows.length * CH + (rows.length - 1) * GY + 8,
      unconnected: d.people.length - unitOf.size
    };
  }

  /* katakning markazidagi x */
  function memberX(u, id) {
    if (u.members.length === 1) return u.x;
    return u.members[0].id === id ? u.x - (CW + MG) / 2 : u.x + (CW + MG) / 2;
  }
  /* chiziq ota-ona blokining qayeridan chiqadi */
  /* Chiziq juftlikning oʻrtasidan chiqadi — farzand ikkalasiniki */
  function anchorX(u) {
    return u.x;
  }
  const rowY = u => u.row * (CH + GY);

  function drawChart(ch) {
    const d = data();
    let cards = "", paths = "", marks = "";
    ch.units.forEach(u => {
      const y = rowY(u);
      u.members.forEach(m => {
        const cx = memberX(u, m.id);
        cards += card(m, Math.round(cx - CW / 2), y);
      });
      if (u.members.length > 1) {
        const midY = y + CH / 2;
        paths += '<path d="M' + (u.x - MG / 2 - 1) + ' ' + midY + ' H' + (u.x + MG / 2 + 1) + '"/>';
        marks += '<span class="s-ring" style="left:' + (u.x - 7) + 'px;top:' + (midY - 7) + 'px">⚭</span>';
      }
    });
    ch.links.forEach(l => {
      const px = anchorX(l.pu), py = rowY(l.pu) + CH;
      const cx = memberX(l.cu, l.childId), cy = rowY(l.cu);
      const bus = py + GY / 2;
      paths += '<path d="M' + px + ' ' + py + ' V' + bus + ' H' + cx + ' V' + cy + '"/>';
    });
    return '<div class="s-zoom"><div class="s-chart" data-w="' + ch.width + '" data-h="' + ch.height + '"' +
      ' style="width:' + ch.width + 'px;height:' + ch.height + 'px;' +
      '--cw:' + CW + 'px;--ch:' + CH + 'px;--av:' + AV + 'px;--lines:' + LINES + '">' +
      '<svg width="' + ch.width + '" height="' + ch.height + '" aria-hidden="true">' + paths + '</svg>' +
      cards + marks + '</div></div>';
  }

  function render(el) {
    const d = data();
    let h = '<div class="h-seg" style="margin-bottom:16px">' +
      [["tree", "Daraxt"], ["list", "Roʻyxat"], ["add", "Odam qoʻshish"]]
        .map(([k, nm]) => '<button data-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + nm + '</button>').join("") +
      '</div>';

    if (!d.people.length) {
      h += '<div class="h-empty">Shajara boʻsh. Eng katta ajdodingizdan boshlang: «Odam qoʻshish» → ism, ota-onasini keyin ulaysiz.</div>';
      if (tab !== "add") { el.innerHTML = h; return; }
    }

    if (tab === "tree" && d.people.length) {
      const anchorId = (d.rootId && person(d.rootId)) ? d.rootId
        : ((d.selfId && person(d.selfId)) ? d.selfId : d.people[0].id);
      const ch = buildChart(anchorId);
      if (ch) {
        h += '<div class="s-tree">' + drawChart(ch) + '</div>' +
          (ch.unconnected ? '<p class="h-note" style="margin-top:10px"><b>' + ch.unconnected +
            ' kishi</b> hali hech kimga ulanmagan — «Roʻyxat» boʻlimidan tahrirlab ulab qoʻying.</p>' : '');
        h += '<div class="h-stats" style="margin-top:16px">' +
          '<div class="h-stat"><b>' + d.people.length + '</b><span>jami odam</span></div>' +
          '<div class="h-stat"><b>' + ch.rows.length + '</b><span>avlod</span></div>' +
          '<div class="h-stat"><b>' + ch.units.filter(u => u.members.length > 1).length + '</b><span>oila</span></div></div>';
      }
    }

    if (tab === "list" && d.people.length) {
      h += '<div class="h-card" data-m="shajara"><div class="h-list">' +
        d.people.slice().sort((a, b) => (a.birth || "9999") < (b.birth || "9999") ? -1 : 1).map(p => {
          const f = p.fatherId ? person(p.fatherId) : null, m = p.motherId ? person(p.motherId) : null;
          const sp = p.spouseId ? person(p.spouseId) : null;
          return '<div class="h-item">' + avatar(p, "sm") + '<span class="ttl">' + H.esc(p.name) +
            '<span class="sub">' + (relTo(p) ? relTo(p) + " · " : "") + (fmtFull(p.birth) || "sana yoʻq") +
            (fmtFull(p.death) ? " – " + fmtFull(p.death) : "") +
            (f ? " · otasi: " + H.esc(f.name) : "") + (m ? " · onasi: " + H.esc(m.name) : "") +
            (sp ? " · ⚭ " + H.esc(sp.name) : "") + '</span></span>' +
            '<button class="h-link" data-edit="' + p.id + '">tahrir</button>' +
            '<button class="h-link" data-del="' + p.id + '">oʻchirish</button></div>';
        }).join("") + '</div></div>';
    }

    if (tab === "add") h += '<div class="h-card" data-m="shajara"><div class="h-card-h"><h3>' +
      (editing ? "Maʼlumotni tahrirlash" : "Yangi odam") + '</h3></div>' + form() + '</div>';

    el.innerHTML = h;

    /* Masshtab: avval ekranga sigʻdiriladi, keyin barmoq bilan oʻzgartiriladi */
    const box = el.querySelector(".s-tree");
    if (box) {
      const chart = box.querySelector(".s-chart");
      const zoom = box.querySelector(".s-zoom");
      if (chart && zoom) {
        const W = +chart.dataset.w, Hh = +chart.dataset.h;
        const fit = () => Math.max(0.2, Math.min(1, (box.clientWidth - 8) / W, (box.clientHeight - 8) / Hh));
        let k = d.zoom ? d.zoom : fit();
        const apply = v => {
          k = Math.max(0.2, Math.min(2, v));
          chart.style.transform = "scale(" + k + ")";
          zoom.style.width = Math.ceil(W * k) + "px";
          zoom.style.height = Math.ceil(Hh * k) + "px";
          return k;
        };
        apply(k);

        /* FISH sigʻmasa — katakni balandroq qilib qayta chizamiz */
        /* FISH toʻliq sigʻdimi? Shrift yuklangandan keyin oʻlchaymiz —
           aks holda zaxira shrift bilan notoʻgʻri chiqadi. */
        const measure = () => {
          if (!el.isConnected || !chart.isConnected) return false;
          const names = [].slice.call(chart.querySelectorAll(".s-info b"));
          if (!names.length) return false;
          const limits = names.map(n => n.clientHeight);
          names.forEach(n => { n.style.webkitLineClamp = "unset"; });
          const fulls = names.map(n => n.scrollHeight);
          names.forEach(n => { n.style.webkitLineClamp = ""; });
          const tooSmall = fulls.some((f, i) => f > limits[i] + 1);
          if (tooSmall && LINES < 8 && fitPass < 6) {
            autoLines = LINES + 1; fitPass++;
            setTimeout(() => render(el), 0);
            return true;
          }
          if (!autoLines) autoLines = LINES;
          return false;
        };
        if (document.fonts && document.fonts.status !== "loaded") {
          document.fonts.ready.then(() => measure());
        } else if (measure()) {
          return;
        }

        /* «men» katagi koʻrinadigan joyga surib qoʻyamiz */
        const me = chart.querySelector(".s-node.self") || chart.querySelector(".s-node");
        if (me && box.scrollWidth > box.clientWidth) {
          const r1 = box.getBoundingClientRect(), r2 = me.getBoundingClientRect();
          box.scrollLeft += (r2.left - r1.left) - box.clientWidth / 2 + r2.width / 2;
        }

        /* fokus nuqtasini joyida ushlab turib masshtabni oʻzgartirish */
        /* Masshtab oʻzgarganda ekran markazidagi joy joyida qoladi —
           shunda daraxt chetga qochib ketmaydi. */
        const zoomAt = ratio => {
          const cx = (box.scrollLeft + box.clientWidth / 2) / k;
          const cy = (box.scrollTop + box.clientHeight / 2) / k;
          const nk = apply(k * ratio);
          void box.scrollWidth;                      // yangi oʻlcham hisobga olinsin
          box.scrollLeft = Math.max(0, cx * nk - box.clientWidth / 2);
          box.scrollTop = Math.max(0, cy * nk - box.clientHeight / 2);
          d.zoom = nk;
        };

        let dist0 = 0, busy = false;
        box.addEventListener("touchstart", ev => {
          if (ev.touches.length === 2) {
            busy = true;
            dist0 = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX,
                               ev.touches[0].clientY - ev.touches[1].clientY);
          }
        }, { passive: true });
        box.addEventListener("touchmove", ev => {
          if (ev.touches.length !== 2 || !busy) return;
          ev.preventDefault();
          const d1 = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX,
                                ev.touches[0].clientY - ev.touches[1].clientY);
          if (!dist0) { dist0 = d1; return; }
          zoomAt(d1 / dist0);
          dist0 = d1;
        }, { passive: false });
        box.addEventListener("touchend", () => {
          if (!busy) return;
          busy = false; dist0 = 0;
          H.store.save(NS);
        });

        /* kompyuterda: Ctrl + gʻildirak yoki chertib surish */
        box.addEventListener("wheel", ev => {
          if (!ev.ctrlKey && !ev.metaKey) return;
          ev.preventDefault();
          zoomAt(ev.deltaY < 0 ? 1.1 : 0.9);
          H.store.save(NS);
        }, { passive: false });

        /* ikki marta bosilsa — ekranga sigʻdirish */
        box.addEventListener("dblclick", () => { d.zoom = 0; H.store.save(NS); render(el); });
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
      '<input class="h-in" name="' + name + 'Y" inputmode="numeric" maxlength="4" placeholder="yil" value="' + H.esc(v.y) + '">' +
      '<select class="h-in" name="' + name + 'M"><option value="">oy</option>' +
      H.MONTHS.map((nm, i) => '<option value="' + (i + 1) + '"' + ((+v.m) === i + 1 ? " selected" : "") + '>' + nm + '</option>').join("") +
      '</select>' +
      '<input class="h-in" name="' + name + 'D" inputmode="numeric" maxlength="2" placeholder="kun" value="' + H.esc(v.d ? String(+v.d) : "") + '">' +
      '</div></div>';
  }

  function form() {
    const d = data();
    const p = editing || preset || {};
    const opts = (sel, gender) => '<option value="">— yoʻq —</option>' + d.people
      .filter(x => x.id !== p.id && (!gender || x.gender === gender))
      .map(x => '<option value="' + x.id + '"' + (x.id === sel ? " selected" : "") + '>' + H.esc(x.name) + '</option>').join("");
    const shot = (photoBuf !== null) ? photoBuf : (p.photo || "");
    return '<form data-form="p" class="h-form">' +
      '<input type="hidden" name="id" value="' + (p.id || "") + '">' +
      '<div class="h-field wide"><label>Surat</label><div class="s-photo">' +
        avatar({ name: p.name || "?", gender: p.gender, photo: shot }, "big") +
        '<div class="h-row">' +
          '<button type="button" class="h-btn sm" data-photo="pick">' + (shot ? "Boshqa surat" : "Surat tanlash") + '</button>' +
          (shot ? '<button type="button" class="h-btn sm" data-photo="clear">Oʻchirish</button>' : '') +
          '<input type="file" accept="image/*" id="s-file" hidden>' +
        '</div>' +
        '<p class="h-note" style="flex-basis:100%;margin:0">Surat 320×320 qilib kichraytiriladi — kattalashtirganda ham tiniq koʻrinadi.</p>' +
      '</div></div>' +
      '<div class="h-field wide"><label>Ismi, familiyasi, otasining ismi</label><input class="h-in" name="name" required value="' + H.esc(p.name || "") + '"></div>' +
      '<div class="h-field"><label>Jinsi</label><select class="h-in" name="gender">' +
      '<option value="m"' + (p.gender !== "f" ? " selected" : "") + '>Erkak</option>' +
      '<option value="f"' + (p.gender === "f" ? " selected" : "") + '>Ayol</option></select></div>' +
      dateField("Tugʻilgan sanasi", "birth", p.birth) +
      dateField("Vafot etgan sanasi", "death", p.death) +
      '<div class="h-field"><label>Otasi</label><select class="h-in" name="fatherId">' + opts(p.fatherId, "m") + '</select></div>' +
      '<div class="h-field"><label>Onasi</label><select class="h-in" name="motherId">' + opts(p.motherId, "f") + '</select></div>' +
      '<div class="h-field"><label>Turmush oʻrtogʻi</label><select class="h-in" name="spouseId">' + opts(p.spouseId) + '</select></div>' +
      '<div class="h-field wide"><label>Eslatma</label><input class="h-in" name="note" value="' + H.esc(p.note || "") + '" placeholder="Kasbi, tugʻilgan joyi, esda qolgan gapi…"></div>' +
      '<div class="h-field wide h-row"><button class="h-btn pri">' + (editing ? "Saqlash" : "Qoʻshish") + '</button>' +
      ((editing || preset) ? '<button type="button" class="h-btn sm" data-cancel="1">Bekor</button>' : '') + '</div></form>';
  }

  function onChange(e) {
    const el = e.currentTarget;
    const r = e.target.closest("[data-root]");
    if (r) { const d = data(); d.rootId = r.value; H.store.save(NS); render(el); return; }
    const f = e.target.closest("#s-file");
    if (f && f.files && f.files[0]) {
      readPhoto(f.files[0], src => {
        if (!src) {
          alert("Suratni oʻqib boʻlmadi. Telefon uni HEIC formatida saqlagan boʻlishi mumkin — " +
                "kamera sozlamasidan «JPEG / mos keluvchi» formatni tanlang, yoki suratni " +
                "galereyada tahrirlab (masalan kesib) saqlagach qayta urinib koʻring.");
          return;
        }
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
      if (!confirm(p.name + " shajaradan oʻchirilsinmi?")) return;
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
      '<button class="h-link" data-close="1">yopish</button></div>' +
      '<p class="h-note">' +
        (relTo(p) ? "<b>" + relTo(p) + "</b> · " : "") +
        (fmtFull(p.birth) ? "Tugʻilgan: " + fmtFull(p.birth) +
          (ageText(p) ? " (" + ageText(p) + ")" : "") : "sana koʻrsatilmagan") +
        (fmtFull(p.death) ? " · vafoti: " + fmtFull(p.death) : "") +
        (p.spouseId && person(p.spouseId) ? " · turmush oʻrtogʻi: " + H.esc(person(p.spouseId).name) : "") +
        (p.note ? " · " + H.esc(p.note) : "") + '</p>' +
      '<div class="h-row" style="margin-top:12px">' +
      (p.fatherId && person(p.fatherId) ? "" : '<button class="h-btn sm" data-x="father">Otasini qoʻshish</button>') +
      (p.motherId && person(p.motherId) ? "" : '<button class="h-btn sm" data-x="mother">Onasini qoʻshish</button>') +
      ((p.fatherId && person(p.fatherId)) || (p.motherId && person(p.motherId))
        ? '<button class="h-btn sm" data-x="sib">Aka-uka, opa-singil</button>' : '') +
      '<button class="h-btn sm" data-x="child">Farzand qoʻshish</button>' +
      (p.spouseId && person(p.spouseId) ? "" : '<button class="h-btn sm" data-x="spouse">Turmush oʻrtogʻi qoʻshish</button>') +
      '<button class="h-btn sm" data-x="edit">Tahrirlash</button>' +
      '<button class="h-btn sm" data-x="self">' + (d.selfId === id ? "«men» belgisini olish" : "«men» deb belgilash") + '</button>' +
      '<button class="h-btn sm" data-x="root">Shu yerdan koʻrsatish</button>' +
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
      if (x === "sib") {
        preset = { fatherId: p.fatherId || "", motherId: p.motherId || "", gender: "m" };
        editing = null; photoBuf = null; tab = "add"; render(el);
      }
      if (x === "father" || x === "mother") {
        /* yangi odam shu kishining otasi/onasi boʻlib qoʻshiladi */
        parentFor = { childId: id, role: x };
        preset = { gender: x === "father" ? "m" : "f" };
        const other = x === "father" ? (p.motherId && person(p.motherId)) : (p.fatherId && person(p.fatherId));
        if (other) preset.spouseId = other.id;      // ikkinchi ota-ona boʻlsa — darhol er-xotin qilib ulaymiz
        editing = null; photoBuf = null; tab = "add"; render(el);
      }
      if (x === "edit") { editing = p; preset = null; photoBuf = null; tab = "add"; render(el); }
      if (x === "self") { d.selfId = d.selfId === id ? "" : id; H.store.save(NS); render(el); }
      if (x === "root") { d.rootId = id; autoLines = 0; fitPass = 0; H.store.save(NS); tab = "tree"; render(el); }
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

    /* «Otasini/onasini qoʻshish» orqali kelingan boʻlsa — farzandga ulaymiz */
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

    /* turmush oʻrtogʻi ikki tomonlama bogʻlanadi */
    const spId = self.spouseId;
    if (spId) { const sp = person(spId); if (sp && sp.spouseId !== me) sp.spouseId = me; }
    d.people.forEach(x => { if (x.id !== me && x.spouseId === me && spId !== x.id) x.spouseId = ""; });

    /* ota-ona oʻzgargan boʻlsa, daraxtni eng yuqori ajdoddan koʻrsatamiz */
    if (movedUp || (id && (self.fatherId !== wasFather || self.motherId !== wasMother))) {
      d.rootId = topAncestor(me);
    }

    editing = null; preset = null; photoBuf = null; tab = "tree";
    H.store.save(NS); render(el);
  }
})(window.H);
