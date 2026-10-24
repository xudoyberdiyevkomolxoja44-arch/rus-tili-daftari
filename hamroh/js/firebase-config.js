/* ============ Umumiy server sozlamasi ============
   Firebase konsolidan olingan qiymatlarni shu yerga qoʻying.
   Boʻsh boʻlsa ilova faqat shu qurilmada ishlaydi (hammasi avvalgidek).

   Qanday olinadi:
   1. console.firebase.google.com  →  Add project  →  nom: qadam
   2. Build → Firestore Database → Create database → Start in production mode
   3. Build → Authentication → Get started → Sign-in method → Email/Password → Enable
   4. Project settings (⚙) → Your apps → Web (</>) → nom: qadam → Register app
   5. Chiqqan firebaseConfig ichidagi qiymatlarni shu yerga koʻchiring.
   6. Firestore → Rules boʻlimiga qoidalarni qoʻying (README da yozilgan). */
window.QADAM_FB = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};
