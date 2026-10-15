/* ============ Созламалар ============
   Профил, маълумотни заҳиралаш (нусха олиш) ва тиклаш. */
(function (H) {
  const NS = "profil";
  const DEF = { name: "", theme: "auto" };
  const RUS_KEY = "rus-daftar-v1";
  const VERSION = "1.0";

  H.store.get(NS, DEF);          /* бошланғич қийматни дарҳол рўйхатдан ўтказамиз */
  const data = () => H.store.get(NS, DEF);

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
    return { app: "hamroh", v: VERSION, at: new Date().toISOString(), data: all, rus };
  }

  function counts() {
    const n = H.store.get("namoz"), o = H.store.get("oila"), sh = H.store.get("shajara"),
          i = H.store.get("ish"), sp = H.store.get("sport");
    return [
      ["Намоз ёзуви", Object.keys(n.log || {}).length + " кун"],
      ["Оила аъзоси", (o.members || []).length + " та"],
      ["Шажарада", (sh.people || []).length + " та одам"],
      ["Иш куни", Object.keys(i.days || {}).length + " та"],
      ["Вазифа", (i.tasks || []).length + " та"],
      ["Машғулот", (sp.sessions || []).length + " та"],
      ["Рус тили", (H.rusSummary().started ? H.rusSummary().day + "-кун" : "бошланмаган")]
    ];
  }

  H.mod({
    id: "sozlama", title: "Созлама",
    init(el) { el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit); el.addEventListener("change", onChange); },
    show(el) { render(el); }
  });

  function render(el) {
    const d = data();
    let h = '<div class="h-card"><div class="h-card-h"><h3>Профил</h3></div>' +
      '<form data-form="profil" class="h-form">' +
      '<div class="h-field wide"><label>Исмингиз</label>' +
      '<input class="h-in" name="name" value="' + H.esc(d.name || "") + '" placeholder="Илова сизни шу ном билан чақиради"></div>' +
      '<div class="h-field wide"><label>Кўриниш</label><select class="h-in" name="theme">' +
      [["auto", "Тизимга қараб"], ["light", "Ёруғ"], ["dark", "Қоронғи"]].map(([k, nm]) =>
        '<option value="' + k + '"' + (d.theme === k ? " selected" : "") + '>' + nm + '</option>').join("") +
      '</select></div>' +
      '<div class="h-field wide"><button class="h-btn pri">Сақлаш</button></div></form></div>';

    h += '<div class="h-card"><div class="h-card-h"><h3>Маълумотларим</h3>' +
      '<span class="h-pill' + (H.cloud.on ? " ok" : "") + '">' +
      (H.cloud.on ? "ҳисобга уланган" : "шу қурилмада") + '</span></div>' +
      '<div class="h-list">' + counts().map(([k, v]) =>
        '<div class="h-item"><span class="ttl">' + k + '</span><span class="num">' + v + '</span></div>').join("") +
      '</div>' +
      '<p class="h-note" style="margin:12px 0">Маълумот телефон хотирасида сақланади. ' +
      (H.cloud.on ? "Шунингдек Claude ҳисобингизга ҳам ёзилади — бошқа қурилмада давом эттиришингиз мумкин. "
                  : "Браузер маълумотини тозаласангиз ўчиб кетади — вақти-вақти билан файлга нусха олиб қўйинг. ") +
      '</p>' +
      '<div class="h-row">' +
      '<button class="h-btn" data-act="export">Файлга нусха олиш</button>' +
      '<button class="h-btn" data-act="import">Файлдан тиклаш</button>' +
      '<input type="file" accept="application/json,.json" id="h-file" hidden>' +
      '</div></div>';

    h += '<div class="h-card"><div class="h-card-h"><h3>Ҳамроҳ ҳақида</h3></div>' +
      '<p class="h-note">Версия ' + VERSION + '. Бўлимлар: Бугун, Намоз, Оила, Шажара, Иш, Спорт, Рус тили.</p>' +
      '<p class="h-note" style="margin-top:8px">Илова интернетсиз ҳам ишлайди. Телефон браузерида менюдан ' +
      '«Bosh ekranga qo\'shish» ни танласангиз, алоҳида дастурдек очилади.</p>' +
      '<div class="h-row" style="margin-top:12px">' +
      '<button class="h-btn bad" data-act="wipe">Барча маълумотни ўчириш</button></div></div>';

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
      if (!obj || obj.app !== "hamroh") { alert("Бу Ҳамроҳ нусха файли эмас."); return; }
      if (!confirm("Файлдаги маълумот ҳозиргисининг устига ёзилади. Давом этамизми?")) return;
      H.store.restore(obj.data || {});
      if (obj.rus) { try { localStorage.setItem(RUS_KEY, JSON.stringify(obj.rus)); } catch (err) {} }
      alert("Тикланди. Илова қайта юкланади.");
      location.reload();
    };
    rd.readAsText(f.files[0]);
  }

  function onClick(e) {
    const el = e.currentTarget;
    const a = e.target.closest("[data-act]");
    if (!a) return;
    if (a.dataset.act === "export") {
      const name = "hamroh-" + H.today() + ".json";
      H.download(name, JSON.stringify(snapshot(), null, 1)).then(ok => {
        if (!ok) alert("Файлни сақлаб бўлмади.");
      });
      return;
    }
    if (a.dataset.act === "import") { const f = document.getElementById("h-file"); if (f) f.click(); return; }
    if (a.dataset.act === "wipe") {
      if (!confirm("Намоз, оила, шажара, иш, спорт ва рус тили бўйича БАРЧА ёзувлар ўчирилади. Аввал файлга нусха олганмисиз?")) return;
      if (!confirm("Ростдан ўчирилсинми? Бу амални қайтариб бўлмайди.")) return;
      ["namoz", "oila", "shajara", "ish", "sport", "profil"].forEach(ns => H.store.wipe(ns));
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
