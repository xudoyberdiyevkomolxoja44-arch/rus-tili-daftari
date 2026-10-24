/* ============ Sozlamalar ============
   Profil, maʼlumotni zahiralash (nusxa olish) va tiklash. */
(function (H) {
  const NS = "profil";
  const DEF = { name: "", theme: "auto" };
  const RUS_KEY = "rus-daftar-v1";
  const VERSION = "1.0";

  H.store.get(NS, DEF);          /* boshlangʻich qiymatni darhol roʻyxatdan oʻtkazamiz */
  const data = () => H.store.get(NS, DEF);
  function buildId() {
    const m = document.querySelector('meta[name="app-version"]');
    return m && m.content ? m.content : "—";
  }

  function applyTheme() {
    const t = data().theme;
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }
  H.applyTheme = applyTheme;

  function snapshot() {
    const all = H.store.all();
    let rus = null;
    try { rus = JSON.parse(localStorage.getItem(RUS_KEY)); } catch (e) {}
    return { app: "qadam", v: VERSION, at: new Date().toISOString(), data: all, rus };
  }

  function counts() {
    const n = H.store.get("namoz"), o = H.store.get("oila"), sh = H.store.get("shajara"),
          i = H.store.get("ish"), sp = H.store.get("sport");
    return [
      ["Namoz yozuvi", Object.keys(n.log || {}).length + " kun"],
      ["Oila aʼzosi", (o.members || []).length + " ta"],
      ["Shajarada", (sh.people || []).length + " ta odam"],
      ["Ish kuni", Object.keys(i.days || {}).length + " ta"],
      ["Vazifa", (i.tasks || []).length + " ta"],
      ["Mashgʻulot", (sp.sessions || []).length + " ta"],
      ["Til oʻrganish", (H.tilSummary().started ? H.tilSummary().name + " · " + H.tilSummary().day + "-kun" : "boshlanmagan")]
    ];
  }

  H.mod({
    id: "sozlama", title: "Sozlama",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); el.addEventListener("change", onChange); },
    show(el) { render(el); }
  });

  function render(el) {
    const d = data();
    let h = '<div class="h-card"><div class="h-card-h"><h3>Profil</h3></div>' +
      '<form data-form="profil" class="h-form">' +
      '<div class="h-field wide"><label>Ismingiz</label>' +
      '<input class="h-in" name="name" value="' + H.esc(d.name || "") + '" placeholder="Ilova sizni shu nom bilan chaqiradi"></div>' +
      '<div class="h-field wide"><label>Koʻrinish</label><select class="h-in" name="theme">' +
      [["auto", "Tizimga qarab"], ["light", "Yorugʻ"], ["dark", "Qorongʻi"]].map(([k, nm]) =>
        '<option value="' + k + '"' + (d.theme === k ? " selected" : "") + '>' + nm + '</option>').join("") +
      '</select></div>' +
      '<div class="h-field wide"><button class="h-btn pri">Saqlash</button></div></form></div>';

    h += '<div class="h-card"><div class="h-card-h"><h3>Maʼlumotlarim</h3>' +
      '<span class="h-pill' + (H.cloud.on ? " ok" : "") + '">' +
      (H.cloud.on ? "hisobga ulangan" : "shu qurilmada") + '</span></div>' +
      '<div class="h-list">' + counts().map(([k, v]) =>
        '<div class="h-item"><span class="ttl">' + k + '</span><span class="num">' + v + '</span></div>').join("") +
      '</div>' +
      '<p class="h-note" style="margin:12px 0">Maʼlumot telefon xotirasida saqlanadi. ' +
      (H.cloud.on ? "Shuningdek Claude hisobingizga ham yoziladi — boshqa qurilmada davom ettirishingiz mumkin. "
                  : "Brauzer maʼlumotini tozalasangiz oʻchib ketadi — vaqti-vaqti bilan faylga nusxa olib qoʻying. ") +
      '</p>' +
      '<div class="h-row">' +
      '<button class="h-btn" data-act="export">Faylga nusxa olish</button>' +
      '<button class="h-btn" data-act="import">Fayldan tiklash</button>' +
      '<input type="file" accept="application/json,.json" id="h-file" hidden>' +
      '</div></div>';

    h += '<div class="h-card"><div class="h-card-h"><h3>Qadam haqida</h3></div>' +
      '<p class="h-note">Versiya ' + VERSION + ' · nusxa ' + buildId() +
      '. Boʻlimlar: Bugun, Namoz, Oila, Shajara, Ish, Sport, Til oʻrganish (8 til).</p>' +
      '<p class="h-note" style="margin-top:8px">Ilova internetsiz ham ishlaydi. Telefon brauzerida menyudan ' +
      '«Bosh ekranga qo\'shish» ni tanlasangiz, alohida dasturdek ochiladi.</p>' +
      '<div class="h-row" style="margin-top:12px">' +
      '<button class="h-btn" data-act="refresh">Ilovani yangilash</button>' +
      '<button class="h-btn bad" data-act="wipe">Barcha maʼlumotni oʻchirish</button></div>' +
      '<p class="h-note" style="margin-top:8px">«Ilovani yangilash» — agar telefonda eski koʻrinish qolib ketsa, ' +
      'shu tugma keshni tozalab, eng soʻnggi nusxani yuklaydi. Maʼlumotlaringizga tegmaydi.</p>' +
      '<p class="h-note" style="margin-top:8px">Bosh ekrandagi <b>nom va belgi</b> ilova oʻrnatilganda yozib qolinadi — ' +
      'uni yangilash uchun eski belgini bosh ekrandan oʻchirib, saytni brauzerda ochib, ' +
      'menyudan «Bosh ekranga qo‘shish» ni qayta tanlang.</p></div>';

    el.innerHTML = h;
  }

  function onChange(e) {
    const f = e.target.closest("#h-file");
    if (!f || !f.files || !f.files[0]) return;
    const el = e.currentTarget;
    const rd = new FileReader();
    rd.onload = () => {
      let obj = null;
      try { obj = JSON.parse(rd.result); } catch (err) {}
      if (!obj || obj.app !== "hamroh" && obj.app !== "qadam") { alert("Bu Qadam nusxa fayli emas."); return; }
      if (!confirm("Fayldagi maʼlumot hozirgisining ustiga yoziladi. Davom etamizmi?")) return;
      H.store.restore(obj.data || {});
      if (obj.rus) { try { localStorage.setItem(RUS_KEY, JSON.stringify(obj.rus)); } catch (err) {} }
      alert("Tiklandi. Ilova qayta yuklanadi.");
      location.reload();
    };
    rd.readAsText(f.files[0]);
  }

  function onClick(e) {
    const el = e.currentTarget;
    const a = e.target.closest("[data-act]");
    if (!a) return;
    if (a.dataset.act === "export") {
      const name = "qadam-" + H.today() + ".json";
      H.download(name, JSON.stringify(snapshot(), null, 1)).then(ok => {
        if (!ok) alert("Faylni saqlab boʻlmadi.");
      });
      return;
    }
    if (a.dataset.act === "import") { const f = document.getElementById("h-file"); if (f) f.click(); return; }
    if (a.dataset.act === "refresh") {
      if (H.hardRefresh) H.hardRefresh();
      else location.reload();
      return;
    }
    if (a.dataset.act === "wipe") {
      if (!confirm("Namoz, oila, shajara, ish, sport va til boʻyicha BARCHA yozuvlar oʻchiriladi. Avval faylga nusxa olganmisiz?")) return;
      if (!confirm("Rostdan oʻchirilsinmi? Bu amalni qaytarib boʻlmaydi.")) return;
      ["namoz", "oila", "shajara", "ish", "sport", "profil", "til"].forEach(ns => H.store.wipe(ns));
      try { localStorage.removeItem(RUS_KEY); } catch (err) {}
      location.reload();
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const el = e.currentTarget, d = data(), f = e.target;
    if (f.dataset.form !== "profil") return;
    d.name = String(f.elements.name.value).trim();
    d.theme = f.elements.theme.value;
    H.store.save(NS); applyTheme(); render(el); H.emit("today");
  }
})(window.H);
