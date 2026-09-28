/**
 * rus-tili-daftari.html (Artifact манбаси) дан мустақил PWA сайтини йиғади.
 * Ишлатиш:  node build.mjs
 * Натижа:   docs/index.html  (+ manifest, sw.js, иконкалар ўз жойида туради)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "docs");
const SPLIT = '<header class="top">';

const src = readFileSync(join(ROOT, "rus-tili-daftari.html"), "utf8");
const at = src.indexOf(SPLIT);
if (at < 0) throw new Error("Манба файлда '" + SPLIT + "' топилмади — қидирув белгисини янгиланг.");

const headBits = src.slice(0, at).trim();   // <title>, шрифт линки, <style>
const bodyBits = src.slice(at);             // интерфейс + скрипт

const VERSION = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

const page = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Рус тилини ўзбек тилида ўрганиш: алифбо, луғат, иборалар, грамматика ва такрорлаш машқлари.">
<meta name="theme-color" content="#F1F4F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1620" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Рус дафтари">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
${headBits}
<style>
  body{margin:0}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
</head>
<body>
${bodyBits}
<script>
if ("serviceWorker" in navigator) {
  addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}
</script>
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), page, "utf8");

// sw.js даги кэш версиясини ҳар йиғишда янгилаймиз — эски нусха илиб қолмасин
const swPath = join(OUT, "sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const CACHE = "[^"]*";/, 'const CACHE = "rus-daftar-' + VERSION + '";');
writeFileSync(swPath, sw, "utf8");

console.log("docs/index.html тайёр — " + (page.length / 1024).toFixed(0) + " KB, кэш версияси " + VERSION);
