/* ============ Rul — boʻlimlar chambaragi ============
   Boʻlimlar doira boʻylab, rul chambaragidek terilgan. Oʻrtadagi mayoq
   tepaga qaraydi: chambarakni chapga-oʻngga burganda mayoq roʻparasiga
   kelgan boʻlim tanlanadi, yana bir bosilsa oʻsha boʻlim ochiladi. */
(function (H) {
  const NS = "rul";

  /* chambarakda uzun nom sigʻmaydi */
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

  let list = [], nodes = [];
  let wrap, hubName, hubHint;
  let ang = 0, step = 45, sel = 0;

  const nom = m => SHORT[m.id] || m.title;

  /* tepada (12 soat yoʻnalishida) turgan boʻlim */
  function indexAt(a) {
    const n = list.length;
    return ((Math.round(-a / step) % n) + n) % n;
  }

  /* i-boʻlimni tepaga olib chiqadigan burchak — hozirgisiga eng yaqini */
  function angleFor(i) {
    const full = list.length * step;
    let t = -i * step;
    t += Math.round((ang - t) / full) * full;
    return t;
  }

  function paint() {
    nodes.forEach((b, i) => {
      const on = i === sel;
      b.classList.toggle("on", on);
      b.setAttribute("aria-current", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    const m = list[sel];
    if (m) {
      hubName.textContent = nom(m);
      hubHint.textContent = HINT[m.id] || "ochish uchun bosing";
    }
  }

  function setAngle(a, animate) {
    ang = a;
    wrap.classList.toggle("r-anim", !!animate);
    wrap.style.setProperty("--dial", a.toFixed(2) + "deg");
    const i = indexAt(a);
    if (i !== sel) {
      sel = i;
      paint();
      try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    }
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
      if (e.target.closest(".r-hub") || e.target.closest(".r-turn")) return;
      const r = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
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
      if (d.moved < 4) {                       /* burilmadi — demak bosildi */
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

  /* chambarak oʻlchamiga qarab boʻlimlar radiusi */
  function measure() {
    if (!wrap) return;
    const w = wrap.getBoundingClientRect().width;
    if (w) wrap.style.setProperty("--r", Math.round(w / 2 - w * 0.165) + "px");
  }

  function build(el) {
    list = H.mods.filter(m => m.id !== NS);
    step = 360 / list.length;

    el.innerHTML =
      '<div class="r-screen">' +
        '<div class="r-wrap" id="r-wrap" data-noswipe role="group" aria-label="Boʻlimlar chambaragi">' +
          '<div class="r-rim"></div>' +
          '<div class="r-beam" aria-hidden="true"></div>' +
          '<div class="r-dial">' +
            list.map((m, i) =>
              '<button class="r-item" type="button" style="--a:' + (i * step) + 'deg">' +
              '<span>' + nom(m) + '</span></button>').join("") +
          '</div>' +
          '<button class="r-hub" type="button" id="r-hub">' +
            '<span class="r-hub-mark" aria-hidden="true"></span>' +
            '<b id="r-hub-name"></b>' +
            '<i id="r-hub-hint"></i>' +
          '</button>' +
        '</div>' +
        '<div class="r-turns">' +
          '<button class="r-turn" type="button" data-t="-1" aria-label="Chapga burish">‹</button>' +
          '<span class="r-note">Chambarakni burib boʻlim tanlang, mayoqni bosib kiring</span>' +
          '<button class="r-turn" type="button" data-t="1" aria-label="Oʻngga burish">›</button>' +
        '</div>' +
      '</div>';

    wrap = el.querySelector("#r-wrap");
    nodes = [].slice.call(el.querySelectorAll(".r-item"));
    hubName = el.querySelector("#r-hub-name");
    hubHint = el.querySelector("#r-hub-hint");

    el.querySelector("#r-hub").addEventListener("click", open);
    el.querySelectorAll(".r-turn").forEach(b =>
      b.addEventListener("click", () => turn(Number(b.dataset.t))));

    bind();
    measure();
    addEventListener("resize", measure);
    paint();
  }

  H.mod({
    id: NS, title: "Qadam", root: true,
    init: build,
    show() {
      measure();
      /* oxirgi ochilgan boʻlim mayoq roʻparasida tursin */
      let last = null;
      try { last = localStorage.getItem("hamroh:tab"); } catch (e) {}
      const i = list.map(m => m.id).indexOf(last);
      if (i >= 0 && i !== sel) { sel = i; paint(); }
      setAngle(angleFor(sel), false);
    }
  });
})(window.H);
