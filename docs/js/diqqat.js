/* ============ Diqqat rejimi ============
   Ilova butun ekranni egallaydi, ekran oʻchmay turadi, sarlavha va
   eslatmalar yashiriladi — faqat qilayotgan ishingiz koʻrinadi.

   Muhim: sayt telefonning boshqa ilovalaridan keladigan xabarlarni
   toʻxtata olmaydi — bu faqat telefonning oʻz «Bezovta qilmang»
   rejimi orqali boʻladi. Shuning uchun u haqida eslatib turamiz. */
(function (H) {
  const NS = "diqqat";
  const DEF = { mins: 25, dnd: false };
  const CHOICE = [10, 15, 25, 45, 60, 0];     /* 0 — cheksiz */

  const data = () => H.store.get(NS, DEF);

  let endAt = 0;          /* 0 — cheksiz yoki oʻchiq */
  let on = false;
  let tick = null, lock = null, pill = null;

  const left = () => (endAt ? Math.max(0, endAt - Date.now()) : -1);

  function clock(ms) {
    const s = Math.round(ms / 1000);
    return H.pad(Math.floor(s / 60)) + ":" + H.pad(s % 60);
  }

  /* ---------- ekran oʻchmasin ---------- */
  async function awake(yes) {
    try {
      if (yes) {
        if (!lock && navigator.wakeLock) {
          lock = await navigator.wakeLock.request("screen");
          lock.addEventListener("release", () => { lock = null; });
        }
      } else if (lock) { await lock.release(); lock = null; }
    } catch (e) { lock = null; }
  }
  /* ilova fonga tushib qaytsa — qulfni qayta olamiz */
  document.addEventListener("visibilitychange", () => {
    if (on && document.visibilityState === "visible") awake(true);
  });

  /* ---------- butun ekran ---------- */
  function full(yes) {
    try {
      const el = document.documentElement;
      if (yes) {
        const f = el.requestFullscreen || el.webkitRequestFullscreen;
        if (f) { const p = f.call(el); if (p && p.catch) p.catch(() => {}); }
      } else if (document.fullscreenElement || document.webkitFullscreenElement) {
        const x = document.exitFullscreen || document.webkitExitFullscreen;
        if (x) { const p = x.call(document); if (p && p.catch) p.catch(() => {}); }
      }
    } catch (e) {}
  }

  /* ---------- pastdagi kichik belgi ---------- */
  function slot() {
    if (pill && pill.isConnected) return pill;
    pill = document.createElement("div");
    pill.id = "d-pill";
    pill.hidden = true;
    pill.innerHTML =
      '<span class="d-dot" aria-hidden="true"></span>' +
      '<b id="d-left">Diqqat</b>' +
      '<button class="d-out" type="button">Chiqish</button>';
    pill.querySelector(".d-out").addEventListener("click", () => stop());
    document.body.appendChild(pill);
    return pill;
  }

  function paintPill() {
    const el = slot();
    el.hidden = !on;
    if (!on) return;
    const ms = left();
    el.querySelector("#d-left").textContent =
      "Diqqat" + (ms < 0 ? "" : " · " + clock(ms));
  }

  /* ---------- yoqish va oʻchirish ---------- */
  function start(mins) {
    on = true;
    endAt = mins ? Date.now() + mins * 60000 : 0;
    document.documentElement.dataset.diqqat = "1";
    awake(true);
    full(true);
    if (tick) clearInterval(tick);
    tick = setInterval(beat, 1000);
    paintPill();
    H.go("rul");                       /* chambarakka qaytamiz — ish boshlanadi */
  }

  function stop(tugadi) {
    on = false; endAt = 0;
    delete document.documentElement.dataset.diqqat;
    awake(false);
    full(false);
    if (tick) { clearInterval(tick); tick = null; }
    paintPill();
    if (tugadi) { try { navigator.vibrate && navigator.vibrate([90, 70, 90]); } catch (e) {} }
    if (H.active() === NS) H.renderActive();
  }

  function beat() {
    if (!on) return;
    if (endAt && Date.now() >= endAt) { stop(true); return; }
    paintPill();
    if (H.active() === NS) {
      const t = document.getElementById("d-big");
      if (t) t.textContent = endAt ? clock(left()) : "∞";
    }
  }

  /* ---------- boʻlim sahifasi ---------- */
  function render(el) {
    const d = data();

    if (on) {
      el.innerHTML =
        '<div class="h-card d-live">' +
          '<h2 class="h-h2">Diqqat rejimi yoqilgan</h2>' +
          '<div class="d-big" id="d-big">' + (endAt ? clock(left()) : "∞") + '</div>' +
          '<p class="h-note">Ekran oʻchmaydi, sarlavha va eslatmalar yashirilgan. ' +
          'Chambarakka qaytib ishingizni davom ettiring.</p>' +
          '<div class="h-row end"><button class="h-btn" type="button" data-stop>Toʻxtatish</button></div>' +
        '</div>';
      el.querySelector("[data-stop]").addEventListener("click", () => stop());
      return;
    }

    el.innerHTML =
      '<div class="h-card">' +
        '<h2 class="h-h2">Diqqat rejimi</h2>' +
        '<p class="h-note">Ilova butun ekranni egallaydi, ekran oʻchmay turadi, ' +
        'sarlavha va eslatmalar yashiriladi — faqat qilayotgan ishingiz koʻrinadi.</p>' +
        '<div class="d-lbl">Qancha vaqt</div>' +
        '<div class="d-choice">' +
          CHOICE.map(m =>
            '<button class="h-btn sm d-m' + (m === d.mins ? " on" : "") + '" type="button" ' +
            'data-m="' + m + '" aria-pressed="' + (m === d.mins) + '">' +
            (m ? m + " daq" : "cheksiz") + '</button>').join("") +
        '</div>' +
        '<div class="h-row end" style="margin-top:14px">' +
          '<button class="h-btn pri" type="button" data-go>Boshlash</button>' +
        '</div>' +
      '</div>' +
      '<div class="h-card d-dnd">' +
        '<h2 class="h-h2">Boshqa ilovalarning xabarlari</h2>' +
        '<p class="h-note">Qadam — sayt, shuning uchun u boshqa ilovalardan keladigan ' +
        'xabarlarni oʻzi toʻxtata olmaydi: buni faqat telefonning oʻzi qiladi. ' +
        'Diqqat rejimidan oldin telefonda <b>«Bezovta qilmang»</b> ni yoqib qoʻying — ' +
        'Androidda tepadan pastga surib oy belgisini, iPhoneda Boshqaruv markazidan ' +
        '<b>«Fokus»</b> ni bosing.</p>' +
        (d.dnd ? "" :
          '<div class="h-row end"><button class="h-btn sm" type="button" data-ok>Tushunarli</button></div>') +
      '</div>';

    el.querySelectorAll(".d-m").forEach(b => b.addEventListener("click", () => {
      data().mins = Number(b.dataset.m);
      H.store.save(NS);
      render(el);
    }));
    el.querySelector("[data-go]").addEventListener("click", () => start(data().mins));
    const ok = el.querySelector("[data-ok]");
    if (ok) ok.addEventListener("click", () => { data().dnd = true; H.store.save(NS); render(el); });
  }

  H.store.get(NS, DEF);

  H.mod({ id: NS, title: "Diqqat", render: render });

})(window.H);
