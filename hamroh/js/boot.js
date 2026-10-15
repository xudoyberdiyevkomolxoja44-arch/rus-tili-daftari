/* ============ Ишга тушириш ============ */
(function (H) {
  const nav = document.getElementById("h-nav");
  const main = document.getElementById("h-main");

  /* бўлимлар тартиби */
  const ORDER = ["bugun", "namoz", "oila", "shajara", "ish", "sport", "til", "sozlama"];
  H.mods.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  /* модуллар учун жой ва тугмалар */
  nav.innerHTML = H.mods.map(m =>
    '<button class="h-navbtn" role="tab" data-m="' + m.id + '" aria-selected="false" aria-controls="m-' + m.id + '">' +
    m.title + '</button>').join("");
  main.innerHTML = H.mods.map(m =>
    '<section class="h-panel" id="m-' + m.id + '" role="tabpanel" hidden></section>').join("");

  nav.addEventListener("click", e => {
    const b = e.target.closest(".h-navbtn");
    if (b) H.go(b.dataset.m);
  });

  /* сана ва кун натижаси сарлавҳада */
  function head() {
    const p = H.store.get("profil", { name: "", theme: "auto" });
    const d = new Date();
    document.getElementById("h-date").textContent =
      d.getDate() + "-" + H.MONTHS[d.getMonth()] + ", " + H.DAYS[d.getDay()];
    const sc = H.dayScore();
    document.getElementById("h-score").innerHTML =
      '<span class="h-ring">' + H.ring(sc.pct, 30) + '<b>' + Math.round(sc.pct * 100) + '%</b></span>';
    document.title = "Қадам" + (p.name ? " — " + p.name : "");
  }
  H.on("today", head);
  H.on("save", head);

  /* тема */
  H.store.get("profil", { name: "", theme: "auto" });
  H.applyTheme();

  let start = "bugun";
  try { const s = localStorage.getItem("hamroh:tab"); if (s && H.byId(s)) start = s; } catch (e) {}
  H.go(start, true);
  head();

  /* ҳисоб билан синхронлаш (бўлмаса илова барибир ишлайверади) */
  H.cloud.init().then(head).catch(() => {});

  /* кун алмашса — ўзи янгилансин */
  let curDay = H.today();
  setInterval(() => {
    const t = H.today();
    if (t !== curDay) { curDay = t; H.renderActive(); head(); }
    else if (H.active() === "bugun" || H.active() === "namoz") head();
  }, 60000);

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})(window.H);
