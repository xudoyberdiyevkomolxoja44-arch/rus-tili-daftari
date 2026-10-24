# Qadam

Kundalik hayotni bir joyda yuritish uchun shaxsiy yordamchi: namoz, oila, shajara, ish, sport
va sakkiz tilni oʻrganish. Telefonga oʻrnatiladi, internetsiz ham ishlaydi, maʼlumot
qurilmada saqlanadi.

**Sayt:** https://xudoyberdiyevkomolxoja44-arch.github.io/rus-tili-daftari/

> Manzildagi `rus-tili-daftari` — ilovani boshlaganimizdagi eski nom. Manzil atayin
> oʻzgartirilmadi: brauzer maʼlumotni manzilga bogʻlab saqlaydi, nom almashsa rus tili
> boʻyicha toʻplangan natija yoʻqolar edi.

## Boʻlimlar

| Boʻlim | Nima qiladi |
| --- | --- |
| **Bugun** | Barcha boʻlimning bugungi holati bir sahifada, kun natijasi foizda |
| **Namoz** | Vaqtlar (hisoblab chiqariladi), kunlik belgilash — jamoat/yakka/qazo, oylik daftar, qazo hisobi |
| **Oila** | Aʼzolar, kunlik-haftalik ahdlar, soʻnggi aloqa sanasi, tugʻilgan kunlar, haftalik oʻz-oʻzini baholash |
| **Shajara** | Ajdodlar daraxti: ota-ona orqali bogʻlanish, «men» belgisi, avlodlar soni |
| **Ish** | Kelish-ketish vaqti, oylik hisobot (soat, kechikish), vazifalar roʻyxati |
| **Sport** | Mashgʻulotlar kundaligi, haftalik maqsad, vazn jurnali va grafigi |
| **Til oʻrganish** | Sakkiz til: rus, ingliz, qozoq, nemis, yapon, xitoy, koreys, arab. Har birida 180–238 soʻz (15 mavzu), 24–36 ibora, yozuv, grammatika va oʻz 90 kunlik rejasi |
| **Sozlama** | Profil, koʻrinish, maʼlumotni faylga nusxa olish va tiklash |

### Namoz vaqtlari haqida

Vaqtlar quyoshning holatidan astronomik yoʻl bilan hisoblanadi (internet kerak emas).
Algoritm London va Nyu-York boʻyicha tekshirilganda maʼlum qiymatlardan 1–3 daqiqa farq qildi.
Shunga qaramay **mahalliy taqvim bilan solishtirib koʻrish kerak**: sozlamalarda har namozga
± daqiqa tuzatish kiritish mumkin. Hisob usuli (18°/18° va boshqalar) va asr hisobi
(hanafiy/shofeiy) ham tanlanadi.

## Fayllar

| Fayl | Vazifasi |
| --- | --- |
| `hamroh/index.html` | Qobiq: sarlavha, navigatsiya, modul joylari |
| `hamroh/css/app.css` | Umumiy uslublar va rang tokenlari |
| `hamroh/css/mod.css` | Boʻlimlarga xos uslublar (kalendar, shajara daraxti) |
| `hamroh/css/rus.css` | Rus tili boʻlimining uslublari |
| `hamroh/js/core.js` | Saqlash, sana hisobi, navigatsiya, umumiy UI yordamchilari |
| `hamroh/js/*.js` | Har bir boʻlim alohida faylda |
| `hamroh/js/til.js` | Til oʻrganish tizimi — barcha tillarga umumiy |
| `hamroh/js/langs/*.js` | Har bir tilning kontenti (yozuv, lugʻat, iboralar, grammatika, reja) |
| `hamroh/js/langs/more.js` | Barcha tillarga qoʻshimcha 5 mavzu (tana, uy, tabiat, oʻqish, bogʻlovchilar) |
| `build.mjs` | Manbadan mustaqil sayt nusxasini (`docs/`) yigʻadi |
| `docs/` | GitHub Pages shu papkadan tarqatadi — qoʻlda tahrirlamang |

## Maʼlumot qayerda saqlanadi

- Har bir boʻlim `localStorage` da oʻz kaliti ostida: `hamroh:namoz`, `hamroh:oila` va hokazo.
- Til oʻrganish: `hamroh:til` (har tilning natijasi alohida).
- Eski «Rus tili daftari» natijasi (`rus-daftar-v1`) birinchi ochilishda avtomatik koʻchiriladi.
- Claude ilovasidagi nusxada maʼlumot hisobga ham yoziladi — qurilmalar orasida sinxron boʻladi.
- **Sozlama → Faylga nusxa olish** barchasini bitta JSON faylga chiqaradi. Vaqti-vaqti bilan
  nusxa olib qoʻyish tavsiya etiladi.

## Umumiy server (oila uchun)

Har bir odam oʻz hisobi bilan kiradi: namoz, oila, ish, sport va til natijalari
**faqat oʻziga** koʻrinadi, **shajara** esa oilaga umumiy va oʻzi yangilanadi.

Sozlash (bir marta, 5 daqiqa):

1. `console.firebase.google.com` → **Add project** → nom: `qadam` → Google Analytics shart emas.
2. **Build → Firestore Database → Create database** → *production mode* → joy: `eur3` yoki yaqinrogʻi.
3. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
4. **Project settings (⚙) → Your apps → Web `</>`** → nom: `qadam` → **Register app**.
   Chiqqan `firebaseConfig` dagi `apiKey`, `authDomain`, `projectId`, `appId` ni
   `hamroh/js/firebase-config.js` ga koʻchiring va `node build.mjs` qiling.
5. **Firestore → Rules** boʻlimiga quyidagini qoʻying va **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /data/{doc} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
    match /families/{code} {
      allow read, write: if request.auth != null;
      match /data/{doc} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

6. **Authentication → Settings → Authorized domains** ga
   `xudoyberdiyevkomolxoja44-arch.github.io` ni qoʻshing.

Soʻng ilovada: **Sozlama → Hisob → Roʻyxatdan oʻtish**, keyin **Oila → Yangi oila ochish**.
Chiqqan 6 harfli kodni yaqinlaringizga bering — ular ham roʻyxatdan oʻtib,
**Oilaga qoʻshilish** orqali kiradi.

> Oila kodi — maxfiy soʻz vazifasini oʻtaydi (32⁶ ≈ 1 milliard variant).
> Uni begonaga bermang; kerak boʻlsa yangi oila ochib, eskisidan chiqib ketish mumkin.
>
> Claude ilovasidagi nusxada umumiy server ishlamaydi (u yerda tashqi serverga
> ulanish taqiqlangan) — u faqat shu qurilmada ishlaydigan nusxa boʻlib qoladi.

## Oʻzgartirish kiritish

```bash
node build.mjs
git add -A && git commit -m "yangilanish" && git push
```

Mahalliy tekshirish:

```bash
python -m http.server 8787 --directory docs
```

## Telefonga oʻrnatish

Saytni telefon brauzerida ochib, menyudan **«Bosh ekranga qo'shish» / «Na ekran "Domoy"»**
ni tanlang. Shundan keyin ilova alohida dastur sifatida ochiladi va internetsiz ishlaydi.

## Yangi til qoʻshish

`hamroh/js/langs/` ga yangi fayl qoʻshib, `H.lang({...})` chaqiriladi va
`hamroh/index.html` ga `<script>` qatori yoziladi. Kontent tuzilishi:

- `script` — yozuv belgilari: `[belgi, "", oʻqilishi, misol, tarjima]`
- Reja **harfdan boshlanadi**: birinchi 6–12 kun faqat yozuvga ajratiladi, soʻzlar alifbo
  tugagandan keyin boshlanadi
- `topics` + `words` — 10 mavzu, har birida 12 soʻz: `[asl, talaffuz, oʻzbekcha, (lotin yozuvi)]`
- `phrases` — 6 vaziyat, har birida 4 ibora
- `grammar` — 8 qoida (HTML)
- `months` — uchta oyning mavzu taqsimoti; reja shundan avtomatik tuziladi
- `keys` — yozish mashqi uchun ekran klaviaturasi, `typeField` — «native» yoki «pron»
