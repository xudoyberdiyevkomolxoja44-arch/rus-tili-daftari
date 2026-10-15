/**
 * hamroh/ манбасидан мустақил PWA сайтини (docs/) йиғади.
 * Ишлатиш:  node build.mjs
 *
 * hamroh/index.html — Artifact учун ҳам ишлатиладиган асосий саҳифа:
 * унда <html>/<head> йўқ, шунинг учун сайт нусхаси учун шу ерда ўралади.
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
if (at < 0) throw new Error("hamroh/index.html да '" + SPLIT + "' топилмади.");

const headBits = src.slice(0, at).trim();
const bodyBits = src.slice(at);
const VERSION = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

const page = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Ҳамроҳ — намоз, оила, шажара, иш, спорт ва рус тилини бир жойда юритадиган шахсий ёрдамчи.">
<meta name="theme-color" content="#F1F4F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1620" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Ҳамроҳ">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
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

/* css ва js файлларини кўчирамиз */
const assets = [];
for (const dir of ["css", "js"]) {
  mkdirSync(join(OUT, dir), { recursive: true });
  for (const f of readdirSync(join(SRC, dir))) {
    copyFileSync(join(SRC, dir, f), join(OUT, dir, f));
    assets.push(dir + "/" + f);
  }
}

/* service worker: кэш версияси ва рўйхати */
const swPath = join(OUT, "sw.js");
if (existsSync(swPath)) {
  let sw = readFileSync(swPath, "utf8");
  sw = sw.replace(/const CACHE = "[^"]*";/, 'const CACHE = "hamroh-' + VERSION + '";');
  sw = sw.replace(/const CORE = \[[^\]]*\];/,
    "const CORE = " + JSON.stringify(
      ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"]
        .concat(assets.map(a => "./" + a))
    ) + ";");
  writeFileSync(swPath, sw, "utf8");
}

console.log("docs/ тайёр — саҳифа " + (page.length / 1024).toFixed(0) + " KB, " +
  assets.length + " та файл, кэш версияси " + VERSION);
