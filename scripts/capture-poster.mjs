// Captures public/img/globe-poster.webp from the live WebGL globe (the hero still + no-WebGL fallback).
// Needs a running preview (`npm run build && npm run preview`) and Playwright (`npx playwright install chromium`).
// Usage: node scripts/capture-poster.mjs [baseUrl]
import { chromium } from 'playwright';
import sharp from 'sharp';
const base = process.argv[2] || 'http://127.0.0.1:4321';
const out = new URL('../public/img/globe-poster.webp', import.meta.url).pathname;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.2 });
await p.addInitScript(() => { addEventListener('globe:ready', (e) => { window.__g = e.detail; }); });
await p.goto(`${base}/?gl=force`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__g, null, { timeout: 30000 });
await p.waitForTimeout(5000); // let the reveal finish
await p.evaluate(() => {
  const g = window.__g;
  const div = document.createElement('div');
  div.id = 'cap';
  div.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:1000px;z-index:99999;background:#000';
  document.body.appendChild(div);
  g.live = false;
  g.spin = false;
  g.cloudsOn = true;
  g.interacted = true;
  g.mount(div, 'explore');
  const d = g.camera.position.length();
  const lat = 18 * Math.PI / 180, lon = 88 * Math.PI / 180;
  g.camera.position.set(d * Math.cos(lat) * Math.cos(lon), d * Math.sin(lat), -d * Math.cos(lat) * Math.sin(lon));
  g.controls.enableDamping = false;
  g.controls.update();
  g.setVisible(true);
});
await p.waitForTimeout(2500);
const buf = await p.locator('#cap').screenshot();
await sharp(buf).resize(1200, 1200).webp({ quality: 78 }).toFile(out);
console.log('poster written', out);
await b.close();
