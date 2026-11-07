/* ============ Rul — boʻlimlar chambaragi ============
   Katta doira ekran tagida, yarmi koʻrinib turadi. Boʻlim panellari uning
   yoyi boʻylab teriladi: chambarak chapga-oʻngga burilganda panel oʻrtaga
   chiqadi, chetdagilari xiralashadi. Oʻrtadagi panel yana bir bosilsa
   oʻsha boʻlim ochiladi. */
(function (H) {
  const NS = "rul";

  const SHORT = { til: "Til" };
  const HINT = {
    bugun: "kun xulosasi",
    namoz: "besh vaqt",
    oila: "ahd va aʼzolar",
    shajara: "nasl daraxti",
    ish: "keldim-ketdim",
    sport: "mashgʻulot",
    til: "sakkiz til",
    diqqat: "xalaqitsiz ish",
    sozlama: "profil va zaxira"
  };

  const FADE = 44;                /* shu burchakdan nariga panel koʻrinmaydi */

  let list = [], nodes = [];
  let wrap, screenEl;
  let ang = 0, step = 40, sel = 0;

  const nom = m => SHORT[m.id] || m.title;
  /* yelpigʻich bir aylanishi = list.length * step; burchak shunga qarab
     [-yarim, +yarim] oraligʻiga keltiriladi */
  const norm = a => {
    const f = list.length * step || 360;
    a = ((a % f) + f) % f;
    return a > f / 2 ? a - f : a;
  };

  /* ---------- xanjar shakli ----------
     Burchaklari dumaloq koʻpburchak: har bir uchida ikki tomonga r qadam
     chekinib, uchning oʻzini egri chiziq nazoratchisi qilamiz. */
  function roundPath(pts, r) {
    const n = pts.length;
    let d = "";
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      const v1x = a.x - p.x, v1y = a.y - p.y, l1 = Math.hypot(v1x, v1y) || 1;
      const v2x = b.x - p.x, v2y = b.y - p.y, l2 = Math.hypot(v2x, v2y) || 1;
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const sx = p.x + v1x * rr / l1, sy = p.y + v1y * rr / l1;
      const ex = p.x + v2x * rr / l2, ey = p.y + v2y * rr / l2;
      d += (i ? "L" : "M") + sx.toFixed(1) + " " + sy.toFixed(1) +
           "Q" + p.x.toFixed(1) + " " + p.y.toFixed(1) + " " +
           ex.toFixed(1) + " " + ey.toFixed(1);
    }
    return d + "Z";
  }

  function shape() {
    if (!screenEl || !nodes.length) return;
    const W = nodes[0].offsetWidth, H = nodes[0].offsetHeight;
    if (!W || !H) return;
    const pts = [
      { x: W * 0.5,  y: 0 },          /* uchi */
      { x: W,        y: H * 0.21 },   /* oʻng yelka */
      { x: W * 0.66, y: H },          /* pastki oʻng */
      { x: W * 0.34, y: H },          /* pastki chap */
      { x: 0,        y: H * 0.21 }    /* chap yelka */
    ];
    screenEl.style.setProperty("--xanjar", 'path("' + roundPath(pts, W * 0.2) + '")');
  }

  /* Sahifa aynan ekran boʻyi boʻlsin — doira tagga tegsin, ortiqcha surilish
     boʻlmasin. .h-wrap ning pastki chekkasi bekor qilinadi. */
  function fit() {
    if (!screenEl) return;
    const box = document.querySelector(".h-wrap");
    const pb = box ? parseFloat(getComputedStyle(box).paddingBottom) || 0 : 0;
    screenEl.style.marginBottom = -pb + "px";
    const t = screenEl.getBoundingClientRect().top + (window.scrollY || 0);
    screenEl.style.minHeight = Math.max(360, Math.round(window.innerHeight - t)) + "px";
    shape();
  }

  /* oʻrtada (yoyning tepasida) turgan boʻlim */
  function indexAt(a) {
    const n = list.length;
    return ((Math.round(-a / step) % n) + n) % n;
  }

  /* i-boʻlimni oʻrtaga olib chiqadigan burchak — hozirgisiga eng yaqini */
  function angleFor(i) {
    const full = list.length * step;
    let t = -i * step;
    t += Math.round((ang - t) / full) * full;
    return t;
  }

  /* panellar: oʻrtadagisi toʻq, chetga borgani sayin xiralashadi */
  function paintArc() {
    nodes.forEach((b, i) => {
      const th = norm(i * step + ang);        /* ekrandagi haqiqiy burchak */
      const d = Math.abs(th);
      const o = d < FADE ? Math.max(0, 1 - d / FADE) : 0;
      b.style.setProperty("--th", th.toFixed(2) + "deg");
      /* chetdagi panelning yozuvi ekrandan chiqib ketmasin — ichkariroqqa */
      b.style.setProperty("--tt", (16 + Math.min(d, step) / step * 20).toFixed(1) + "%");
      b.style.opacity = o.toFixed(3);
      b.style.setProperty("--sc", (1 - Math.min(d, FADE) / FADE * 0.08).toFixed(3));
      b.style.zIndex = String(120 - Math.round(d));
      b.style.pointerEvents = o > 0.12 ? "auto" : "none";
      const on = i === sel;
      b.classList.toggle("on", on);
      b.setAttribute("aria-current", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
  }

  function setAngle(a, animate) {
    ang = a;
    wrap.classList.toggle("r-anim", !!animate);
    wrap.style.setProperty("--dial", a.toFixed(2) + "deg");
    const i = indexAt(a);
    if (i !== sel) {
      sel = i;
      try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    }
    paintArc();
  }

  /* tanlangan boʻlimga yumshoq qoʻnish — masofa qancha uzoq boʻlsa, shuncha uzunroq */
  function settle(i) {
    const t = angleFor(i);
    const far = Math.abs(t - ang) / step;
    wrap.style.setProperty("--spin", (0.17 + Math.min(far, 4) * 0.055).toFixed(2) + "s");
    setAngle(t, true);
  }

  function turn(by) { settle(indexAt(ang) + by); }

  function open() {
    const m = list[sel];
    if (m) H.go(m.id);
  }

  /* ---------- chambarakni burish ---------- */
  function bind() {
    let drag = null;

    wrap.addEventListener("pointerdown", e => {
      const r = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.bottom;   /* doira markazi — tagda */
      drag = {
        id: e.pointerId, cx, cy, ang0: ang, moved: 0, trail: [],
        a0: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI,
        item: e.target.closest(".r-item")
      };
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
      wrap.classList.add("r-grab");
    });

    wrap.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      const a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * 180 / Math.PI;
      let d = a - drag.a0;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      if (Math.abs(d) > drag.moved) drag.moved = Math.abs(d);
      setAngle(drag.ang0 + d, false);
      /* oxirgi ~90 ms — qoʻyib yuborilgandagi tezlikni shundan olamiz */
      const now = performance.now();
      drag.trail.push({ t: now, a: ang });
      while (drag.trail.length > 2 && now - drag.trail[0].t > 90) drag.trail.shift();
    });

    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      wrap.classList.remove("r-grab");
      try { wrap.releasePointerCapture(e.pointerId); } catch (err) {}
      if (d.moved < 3) {                       /* burilmadi — demak bosildi */
        if (d.item) {
          const i = nodes.indexOf(d.item);
          if (i >= 0) { if (i === sel) open(); else settle(i); }
        }
        return;
      }
      /* qoʻyib yuborilgandagi tezlik — chambarak bir oz oʻzi aylanib boradi */
      let v = 0;
      const tr = d.trail;
      if (tr.length > 1) {
        const a = tr[0], b = tr[tr.length - 1];
        if (b.t > a.t) v = (b.a - a.a) / (b.t - a.t);        /* daraja/ms */
      }
      const lim = 3 * step;
      settle(indexAt(ang + Math.max(-lim, Math.min(lim, v * 120))));
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);

    wrap.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") { turn(-1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { turn(1); e.preventDefault(); }
      else if (e.key === "Enter" || e.key === " ") { open(); e.preventDefault(); }
    });
  }

  function build(el) {
    list = H.mods.filter(m => m.id !== NS);
    /* yelpigʻich 360° emas — panellar bir-biriga yaqinroq tursin.
       Toʻliq aylanish list.length * step ga teng, oʻrash shunga qarab ishlaydi. */
    step = 18;

    el.innerHTML =
      '<div class="r-screen">' +
        '<p class="r-note">Chambarakni burib boʻlim tanlang, oʻrtadagisini bosib kiring</p>' +
        '<div class="r-stage" id="r-wrap" data-noswipe role="group" aria-label="Boʻlimlar chambaragi">' +
          list.map((m, i) =>
            '<button class="r-item" type="button" style="--a:' + (i * step) + 'deg">' +
              '<span class="r-fill" aria-hidden="true"></span>' +
              '<span class="r-txt"><b>' + nom(m) + '</b>' +
              '<i>' + (HINT[m.id] || "") + '</i></span>' +
            '</button>').join("") +
          '<div class="r-disc" aria-hidden="true"></div>' +
          '<button class="r-turn chap" type="button" data-t="-1" aria-label="Chapga burish">‹</button>' +
          '<button class="r-turn ong" type="button" data-t="1" aria-label="Oʻngga burish">›</button>' +
        '</div>' +
      '</div>';

    wrap = el.querySelector("#r-wrap");
    screenEl = el.querySelector(".r-screen");
    nodes = [].slice.call(el.querySelectorAll(".r-item"));

    el.querySelectorAll(".r-turn").forEach(b =>
      b.addEventListener("click", () => turn(Number(b.dataset.t))));

    bind();
    addEventListener("resize", fit);
    addEventListener("orientationchange", fit);
  }

  H.mod({
    id: NS, title: "Qadam", root: true,
    init: build,
    show() {
      fit();
      /* oxirgi ochilgan boʻlim oʻrtada tursin */
      let last = null;
      try { last = localStorage.getItem("hamroh:tab"); } catch (e) {}
      const i = list.map(m => m.id).indexOf(last);
      if (i >= 0 && i !== sel) sel = i;
      setAngle(angleFor(sel), false);
    }
  });
})(window.H);
