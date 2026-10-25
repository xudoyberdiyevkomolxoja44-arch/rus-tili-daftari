/* ============ Umumiy server (Firebase) ============
   Har bir foydalanuvchining shaxsiy maʼlumoti  users/<uid>/data/<boʻlim>
   Oilaning umumiy shajarasi          families/<kod>/data/shajara
   Shuning uchun hech kim boshqaning namozi, ishi yoki sportini koʻrmaydi,
   shajara esa butun oilaga umumiy va oʻzi yangilanadi.

   Sozlama boʻsh boʻlsa (firebase-config.js), ilova avvalgidek faqat
   qurilmaning oʻzida ishlayveradi. */
(function (H) {
  const CFG = window.QADAM_FB || {};
  const ON = !!(CFG && CFG.apiKey && CFG.projectId);
  const PERSONAL = ["namoz", "oila", "ish", "sport", "til", "profil", "eslatma"];
  const SHARED = ["shajara"];
  const V = "10.12.2";

  H.acc = { on: ON, ready: false, user: null, family: "", status: ON ? "ulanmoqda" : "oʻchiq", err: "" };

  let fb = null, unsubTree = null, pushTimer = {};

  async function load() {
    if (fb) return fb;
    const [app, auth, store] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/firebase@" + V + "/app/+esm"),
      import("https://cdn.jsdelivr.net/npm/firebase@" + V + "/auth/+esm"),
      import("https://cdn.jsdelivr.net/npm/firebase@" + V + "/firestore/+esm")
    ]);
    const a = app.initializeApp(CFG);
    fb = { app: a, auth: auth.getAuth(a), db: store.getFirestore(a), A: auth, S: store };
    return fb;
  }

  const say = (st, err) => {
    H.acc.status = st; H.acc.err = err || "";
    H.emit("account");
  };

  /* ---------- ulanish ---------- */
  H.cloudInit = async function () {
    if (!ON) return;
    try {
      const f = await load();
      f.A.onAuthStateChanged(f.auth, async u => {
        H.acc.user = u ? { uid: u.uid, email: u.email, name: u.displayName || "" } : null;
        H.acc.ready = true;
        if (!u) { H.acc.family = ""; stopTree(); say("kirilmagan"); return; }
        say("sinxronlanmoqda");
        try {
          await pullProfile();
          await pullAll();
          startTree();
          say("ulangan");
        } catch (e) { say("xato", String(e && e.message || e)); }
        H.renderActive();
      });
    } catch (e) {
      const msg = String(e && e.message || e);
      say("xato", /import|fetch|network|Content Security/i.test(msg)
        ? "Bu nusxada umumiy server ishlamaydi (xavfsizlik cheklovi). Saytdagi nusxani oching."
        : "Serverga ulanib boʻlmadi: " + msg);
    }
  };

  /* ---------- kirish / roʻyxatdan oʻtish ---------- */
  H.cloudSignUp = async function (email, pass, name) {
    const f = await load();
    const cred = await f.A.createUserWithEmailAndPassword(f.auth, email.trim(), pass);
    if (name) { try { await f.A.updateProfile(cred.user, { displayName: name }); } catch (e) {} }
    await f.S.setDoc(f.S.doc(f.db, "users", cred.user.uid),
      { email: email.trim(), name: name || "", family: "", at: Date.now() }, { merge: true });
    return true;
  };
  H.cloudSignIn = async function (email, pass) {
    const f = await load();
    await f.A.signInWithEmailAndPassword(f.auth, email.trim(), pass);
    return true;
  };
  H.cloudSignOut = async function () {
    const f = await load();
    stopTree();
    await f.A.signOut(f.auth);
  };
  H.cloudReset = async function (email) {
    const f = await load();
    await f.A.sendPasswordResetEmail(f.auth, email.trim());
  };

  /* ---------- oila kodi ---------- */
  const CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const newCode = () => {
    let s = "";
    for (let i = 0; i < 6; i++) s += CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)];
    return s;
  };
  async function pullProfile() {
    const f = await load(), u = H.acc.user;
    if (!u) return;
    const snap = await f.S.getDoc(f.S.doc(f.db, "users", u.uid));
    H.acc.family = (snap.exists() && snap.data().family) || "";
  }
  H.cloudCreateFamily = async function () {
    const f = await load(), u = H.acc.user;
    if (!u) throw new Error("Avval tizimga kiring");
    const code = newCode();
    await f.S.setDoc(f.S.doc(f.db, "families", code), { by: u.uid, at: Date.now() }, { merge: true });
    await f.S.setDoc(f.S.doc(f.db, "users", u.uid), { family: code }, { merge: true });
    H.acc.family = code;
    /* shu qurilmadagi shajarani umumiyga koʻchiramiz */
    const local = H.store.get("shajara");
    if (local && (local.people || []).length) await pushShared(local);
    startTree();
    H.emit("account");
    return code;
  };
  H.cloudJoinFamily = async function (code) {
    const f = await load(), u = H.acc.user;
    if (!u) throw new Error("Avval tizimga kiring");
    code = String(code || "").trim().toUpperCase();
    const snap = await f.S.getDoc(f.S.doc(f.db, "families", code));
    if (!snap.exists()) throw new Error("Bunday oila kodi topilmadi");
    await f.S.setDoc(f.S.doc(f.db, "users", u.uid), { family: code }, { merge: true });
    H.acc.family = code;
    startTree();
    H.emit("account");
    return code;
  };
  H.cloudLeaveFamily = async function () {
    const f = await load(), u = H.acc.user;
    if (!u) return;
    await f.S.setDoc(f.S.doc(f.db, "users", u.uid), { family: "" }, { merge: true });
    H.acc.family = ""; stopTree(); H.emit("account");
  };

  /* ---------- shaxsiy boʻlimlar ---------- */
  async function pullOne(ns) {
    const f = await load(), u = H.acc.user;
    if (!u) return;
    const snap = await f.S.getDoc(f.S.doc(f.db, "users", u.uid, "data", ns));
    if (!snap.exists()) return;
    const remote = snap.data();
    const local = H.store.get(ns);
    if (remote && typeof remote._u === "number" && remote._u > (local._u || 0)) {
      H.store.replace(ns, remote);
    }
  }
  async function pullAll() {
    for (const ns of PERSONAL) { try { await pullOne(ns); } catch (e) {} }
    await pullShared();
  }
  async function pushOne(ns, data) {
    const f = await load(), u = H.acc.user;
    if (!u) return;
    await f.S.setDoc(f.S.doc(f.db, "users", u.uid, "data", ns), data);
  }

  /* ---------- umumiy shajara ---------- */
  async function pushShared(data) {
    const f = await load();
    if (!H.acc.family) return;
    await f.S.setDoc(f.S.doc(f.db, "families", H.acc.family, "data", "shajara"), data);
  }
  async function pullShared() {
    const f = await load();
    if (!H.acc.family) return;
    const snap = await f.S.getDoc(f.S.doc(f.db, "families", H.acc.family, "data", "shajara"));
    if (!snap.exists()) return;
    const remote = snap.data(), local = H.store.get("shajara");
    if (remote && typeof remote._u === "number" && remote._u > (local._u || 0)) H.store.replace("shajara", remote);
  }
  function startTree() {
    if (!H.acc.family || !fb) return;
    stopTree();
    const f = fb;
    unsubTree = f.S.onSnapshot(f.S.doc(f.db, "families", H.acc.family, "data", "shajara"), snap => {
      if (!snap.exists()) return;
      const remote = snap.data(), local = H.store.get("shajara");
      if (remote && typeof remote._u === "number" && remote._u > (local._u || 0)) {
        H.store.replace("shajara", remote);
        if (H.active() === "shajara") H.renderActive();
        H.emit("today");
      }
    }, () => {});
  }
  function stopTree() { if (unsubTree) { try { unsubTree(); } catch (e) {} unsubTree = null; } }

  /* ---------- saqlangan narsani serverga yuborish ---------- */
  H.cloudPush = function (ns) {
    if (!ON || !H.acc.user) return;
    clearTimeout(pushTimer[ns]);
    pushTimer[ns] = setTimeout(async () => {
      const data = H.store.get(ns);
      try {
        if (SHARED.indexOf(ns) >= 0) { if (H.acc.family) await pushShared(data); }
        else if (PERSONAL.indexOf(ns) >= 0) await pushOne(ns, data);
      } catch (e) { say("xato", String(e && e.message || e)); }
    }, 1200);
  };

  H.cloudPullNow = async function () {
    if (!ON || !H.acc.user) return;
    say("sinxronlanmoqda");
    try { await pullProfile(); await pullAll(); say("ulangan"); H.renderActive(); }
    catch (e) { say("xato", String(e && e.message || e)); }
  };
})(window.H);
