/* ============ Tugʻilgan kun eslatmasi ============
   Shajara va Oila boʻlimidagi toʻliq sanasi maʼlum odamlar uchun
   toʻrt marta eslatadi: bir oy, bir hafta, ikki kun qolganda va aynan
   oʻsha kuni. Eslatma sahifa tepasida yonib-oʻchib turadi va
   «Xabarim bor» bosilgunicha yoʻqolmaydi.

   Qurilma bildirishnomasi (Notification) ruxsat berilgan boʻlsa,
   har bir eslatma bir martagina chiqariladi. */
(function (H) {
  const NS = "eslatma";
  const DEF = { seen: {}, notified: {} };
  /* [necha kun qolganda, nomi] — tartibi kattadan kichikka */
  const STAGES = [[30, "bir oy"], [7, "bir hafta"], [2, "ikki kun"], [0, "bugun"]];
  const SUFFIX = " — tugʻilgan kuni";

  H.store.get(NS, DEF);

  /* ---------- eskirgan belgilarni tozalash ---------- */
  function prune() {
    const d = H.store.get(NS, DEF);
    const chegara = H.shiftDay(H.today(), -40);
    let n = 0;
    ["seen", "notified"].forEach(f => {
      for (const k in d[f]) if (k.slice(0, 10) < chegara) { delete d[f][k]; n++; }
    });
    if (n) H.store.save(NS);
  }

  /* ---------- hozir koʻrsatilishi kerak boʻlgan eslatmalar ---------- */
  function list() {
    const d = H.store.get(NS, DEF);
    const src = H.oilaUpcoming ? H.oilaUpcoming() : [];
    const out = [];
    src.forEach(x => {
      if (x.kind !== "tug" || x.days < 0 || x.days > STAGES[0][0]) return;
      /* qaysi bosqichdamiz: kunga eng yaqin, lekin undan kichik boʻlmagan bosqich */
      let stage = null, label = "";
      STAGES.forEach(([n, nm]) => {
        if (n >= x.days && (stage === null || n < stage)) { stage = n; label = nm; }
      });
      if (stage === null) return;
      const key = x.iso + "|" + x.title + "|" + stage;
      if (d.seen[key]) return;
      const yosh = x.year > 1900 ? (+x.iso.slice(0, 4)) - x.year : 0;
      out.push({
        key: key, stage: stage, label: label, days: x.days, iso: x.iso, yosh: yosh,
        name: x.title.replace(SUFFIX, "")
      });
    });
    out.sort((a, b) => a.days - b.days);
    return out;
  }
  H.eslatmalar = list;

  /* ---------- qurilma bildirishnomasi ---------- */
  const canNotify = () => typeof Notification !== "undefined";
  H.eslatmaRuxsat = function () {
    if (!canNotify()) { alert("Bu brauzer bildirishnomani qoʻllamaydi."); return; }
    Notification.requestPermission().then(() => { render(); send(list()); });
  };

  function text(x) {
    return x.name + " — " + H.fmtDate(x.iso) +
      (x.yosh > 0 ? " (" + x.yosh + " yoshga toʻladi)" : "") + ". " +
      (x.days === 0 ? "Tugʻilgan kuni bugun." : x.days + " kun qoldi.");
  }

  function send(items) {
    if (!canNotify() || Notification.permission !== "granted") return;
    const d = H.store.get(NS, DEF);
    let yangi = false;
    items.forEach(x => {
      if (d.notified[x.key]) return;
      d.notified[x.key] = Date.now();
      yangi = true;
      const opt = { body: text(x), tag: x.key, lang: "uz" };
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready
            .then(r => r.showNotification("Qadam — tugʻilgan kun", opt))
            .catch(() => { try { new Notification("Qadam — tugʻilgan kun", opt); } catch (e) {} });
        } else new Notification("Qadam — tugʻilgan kun", opt);
      } catch (e) {}
    });
    if (yangi) H.store.save(NS);
  }

  /* ---------- sahifa tepasidagi yonib turuvchi eslatma ---------- */
  let box = null;
  function slot() {
    if (box && box.isConnected) return box;
    box = document.createElement("div");
    box.id = "h-alerts";
    const main = document.getElementById("h-main");
    if (!main) return null;
    main.parentNode.insertBefore(box, main);
    return box;
  }

  function render() {
    const el = slot();
    if (!el) return;
    const items = list();
    if (!items.length) { el.innerHTML = ""; return; }
    const ask = canNotify() && Notification.permission === "default";
    el.innerHTML = items.map(x =>
      '<div class="h-alert blink"><div class="h-alert-t">' +
        '<b>' + (x.days === 0 ? "Bugun tugʻilgan kun" : "Tugʻilgan kun yaqinlashdi") + '</b>' +
        '<span>' + H.esc(x.name) + ' — ' + H.fmtDate(x.iso) +
        (x.yosh > 0 ? ' · ' + x.yosh + ' yosh' : '') + ' · ' +
        (x.days === 0 ? 'bugun' : x.days + ' kun qoldi') + '</span></div>' +
      '<button class="h-btn sm" data-seen="' + H.esc(x.key) + '">Xabarim bor</button></div>').join("") +
      (ask ? '<div class="h-alert quiet"><div class="h-alert-t"><span>Ilova yopiq boʻlganda ham ' +
        'eslatishi uchun bildirishnomaga ruxsat bering.</span></div>' +
        '<button class="h-btn sm pri" data-notif="1">Ruxsat berish</button></div>' : "");
    send(items);
  }
  H.eslatmaRender = render;

  /* ---------- Sozlama boʻlimi uchun karta ---------- */
  H.eslatmaBlock = function () {
    const src = (H.oilaUpcoming ? H.oilaUpcoming() : []).filter(x => x.kind === "tug").slice(0, 6);
    const holat = !canNotify() ? "qoʻllanmaydi"
      : Notification.permission === "granted" ? "yoqilgan"
      : Notification.permission === "denied" ? "taqiqlangan" : "soʻralmagan";
    let h = '<div class="h-card" data-m="oila"><div class="h-card-h"><h3>Tugʻilgan kun eslatmasi</h3>' +
      '<span class="h-pill' + (holat === "yoqilgan" ? " ok" : (holat === "taqiqlangan" ? " warn" : "")) +
      '">' + holat + '</span></div>' +
      '<p class="h-note" style="margin:-4px 0 10px">Shajara va Oila boʻlimidagi odamlar uchun ' +
      '<b>bir oy</b>, <b>bir hafta</b>, <b>ikki kun</b> qolganda va <b>oʻsha kuni</b> eslatiladi. ' +
      'Eslatma sahifa tepasida yonib turadi — «Xabarim bor» bosilsa oʻchadi.</p>';
    if (holat === "soʻralmagan")
      h += '<div class="h-row" style="margin-bottom:10px"><button class="h-btn pri" data-notif="1">' +
        'Bildirishnomani yoqish</button></div>';
    if (holat === "taqiqlangan")
      h += '<div class="h-warn" style="margin-bottom:10px">Bildirishnoma brauzer sozlamasida ' +
        'taqiqlangan. Saytga ruxsat bersangiz, qurilma ham xabar beradi. Ilova ichidagi ' +
        'eslatma baribir ishlayveradi.</div>';
    if (holat === "yoqilgan")
      h += '<p class="h-note" style="margin:-4px 0 10px">Bildirishnoma ilova ochilganda ' +
        'tekshiriladi — telefonda Qadamni vaqti-vaqti bilan ochib turing.</p>';
    h += src.length
      ? '<div class="h-list">' + src.map(x =>
          '<div class="h-item"><span class="ttl">' + H.esc(x.title.replace(SUFFIX, "")) +
          '<span class="sub" style="display:block">' + H.fmtDate(x.iso) +
          (x.year > 1900 ? ' · ' + ((+x.iso.slice(0, 4)) - x.year) + ' yosh' : '') + '</span></span>' +
          '<span class="num">' + (x.days === 0 ? "bugun" : x.days + " kun") + '</span></div>').join("") +
        '</div>'
      : '<div class="h-empty">Hali toʻliq tugʻilgan sanasi yozilgan odam yoʻq. ' +
        'Shajarada kun va oyni ham koʻrsating.</div>';
    return h + '</div>';
  };

  /* ---------- bosishlar ---------- */
  document.addEventListener("click", e => {
    const s = e.target.closest("[data-seen]");
    if (s) {
      const d = H.store.get(NS, DEF);
      d.seen[s.dataset.seen] = Date.now();
      H.store.save(NS);
      render();
      return;
    }
    const n = e.target.closest("[data-notif]");
    if (n) H.eslatmaRuxsat();
  });

  /* ---------- qachon qayta chizish ---------- */
  H.on("save", ns => { if (ns === "shajara" || ns === "oila" || ns === "eslatma") render(); });
  H.on("today", render);
  H.on("cloud", render);
  H.on("account", render);

  let kun = H.today();
  setInterval(() => {
    const t = H.today();
    if (t !== kun) { kun = t; prune(); }
    render();
  }, 60000);

  prune();
  if (document.getElementById("h-main")) render();
  else addEventListener("DOMContentLoaded", render);
})(window.H);
