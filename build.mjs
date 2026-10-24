/**
 * hamroh/ manbasidan mustaqil PWA saytini (docs/) yigʻadi.
 * Ishlatish:  node build.mjs
 *
 * hamroh/index.html — Artifact uchun ham ishlatiladigan asosiy sahifa:
 * unda <html>/<head> yoʻq, shuning uchun sayt nusxasi uchun shu yerda oʻraladi.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "hamroh");
const OUT = join(ROOT, "docs");
const SPLIT = '<header class="h-top">';

const src = readFileSync(join(SRC, "index.html"), "utf8");
const at = src.indexOf(SPLIT);
if (at < 0) throw new Error("hamroh/index.html da '" + SPLIT + "' topilmadi.");

const VER = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const stamp = t => t.replace(/(href|src)="((?:css|js)\/[^"]+)"/g, (m, a, u) => a + '="' + u + "?v=" + VER + '"');
const headBits = stamp(src.slice(0, at).trim());
const bodyBits = stamp(src.slice(at));
const VERSION = VER;

const page = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Qadam — namoz, oila, shajara, ish, sport va sakkiz tilni oʻrganishni bir joyda yuritadigan shaxsiy yordamchi.">
<meta name="theme-color" content="#F4F0E6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#13191B" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Qadam">
<meta name="app-version" content="${VER}">
<link rel="manifest" href="manifest.webmanifest?v=${VER}">
<link rel="icon" href="icon-192.png?v=${VER}" sizes="192x192">
<link rel="apple-touch-icon" href="apple-touch-icon.png?v=${VER}">
${headBits}
<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${bodyBits}
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), page, "utf8");

/* css va js fayllarini (ichki papkalar bilan) koʻchiramiz */
const assets = [];
function copyDir(rel) {
  mkdirSync(join(OUT, rel), { recursive: true });
  for (const e of readdirSync(join(SRC, rel), { withFileTypes: true })) {
    const r = rel + "/" + e.name;
    if (e.isDirectory()) copyDir(r);
    else { copyFileSync(join(SRC, r), join(OUT, r)); assets.push(r); }
  }
}
["css", "js"].forEach(copyDir);

/* service worker: kesh versiyasi va roʻyxati */
const swPath = join(OUT, "sw.js");
if (existsSync(swPath)) {
  let sw = readFileSync(swPath, "utf8");
  sw = sw.replace(/const CACHE = "[^"]*";/, 'const CACHE = "qadam-' + VERSION + '";');
  sw = sw.replace(/const CORE = \[[^\]]*\];/,
    "const CORE = " + JSON.stringify(
      ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"]
        .concat(assets.map(a => "./" + a + "?v=" + VER))
    ) + ";");
  writeFileSync(swPath, sw, "utf8");
}

writeFileSync(join(OUT, "version.json"), JSON.stringify({ version: VERSION }), "utf8");

/* manifestdagi ikonka manzillariga ham versiya qo'shamiz -
   aks holda telefon eski ikonkani keshdan oladi */
const manPath = join(OUT, "manifest.webmanifest");
if (existsSync(manPath)) {
  let man = readFileSync(manPath, "utf8");
  man = man.replace(/"(icon-[^"?]+\.png|apple-touch-icon\.png)(\?v=[0-9]*)?"/g, '"$1?v=' + VER + '"');
  writeFileSync(manPath, man, "utf8");
}

console.log("docs/ tayyor — sahifa " + (page.length / 1024).toFixed(0) + " KB, " +
  assets.length + " ta fayl, kesh versiyasi " + VERSION);
