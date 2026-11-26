// Renders public/og.jpg (1200x630 social card) from the site's own fonts and globe still.
// Needs a running preview and Playwright. Usage: node scripts/render-og.mjs [baseUrl]
import { chromium } from 'playwright';
import sharp from 'sharp';
const base = process.argv[2] || 'http://127.0.0.1:4321';
const outPath = new URL('../public/og.jpg', import.meta.url).pathname;
const html = `<!doctype html><html><head><style>
@font-face{font-family:'Anek Latin';font-weight:100 800;font-stretch:75% 125%;src:url(${base}/fonts/anek-latin-100-800.woff2)}
@font-face{font-family:'Anek Devanagari';font-weight:100 800;font-stretch:75% 125%;src:url(${base}/fonts/anek-devanagari-100-800.woff2)}
@font-face{font-family:'Plex Mono';font-weight:500;src:url(${base}/fonts/plex-mono-500.woff2)}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#000;color:#f3efe4;font-family:'Anek Latin';position:relative;overflow:hidden}
.g{position:absolute;width:820px;height:820px;left:560px;top:-95px}
.v{position:absolute;inset:0;background:linear-gradient(90deg,#000 0%,rgba(0,0,0,.85) 38%,rgba(0,0,0,0) 62%)}
.c{position:absolute;left:64px;top:64px}
.b{display:flex;gap:12px;align-items:baseline;font-weight:600;font-size:26px}
.b .hi{font-family:'Anek Devanagari';color:#d6b36a;font-size:30px}
.b .en{font-stretch:116%}
.n{margin-top:40px;font-weight:640;font-stretch:125%;font-size:200px;line-height:.8;letter-spacing:-.035em;margin-left:-8px;
background:linear-gradient(100deg,#b8924a 0%,#e8c77e 30%,#fff1c9 42%,#d6b36a 55%,#b8924a 75%,#f0cf86 100%);-webkit-background-clip:text;color:transparent}
.o{margin-top:18px;font-size:46px;font-weight:560;font-stretch:112%;line-height:1.05}
.m{position:absolute;left:64px;bottom:36px;font-family:'Plex Mono';color:#d6b36a;opacity:.45;font-size:17px;letter-spacing:.2em;white-space:nowrap}
</style></head><body>
<img class="g" src="${base}/img/globe-poster.webp">
<div class="v"></div>
<div class="c">
 <div class="b"><span class="hi">यात्री डॉक्टर</span><span class="en">Yatri Doctor</span></div>
 <div class="n">177</div>
 <div class="o">of 197 countries,<br>on an Indian passport</div>
</div>
<div class="m">P&lt;INDCHAUDHARY&lt;&lt;NAVANKUR&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
</body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(base + '/robots.txt');
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
const buf = await p.screenshot();
await sharp(buf).jpeg({ quality: 86, mozjpeg: true }).toFile(outPath);
console.log('og written');
await b.close();
