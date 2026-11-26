// One-off asset pipeline. Run with `npm run assets` after changing textures or visit data.
// Outputs are committed so the site build itself stays fast and dependency-light.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const p = (rel) => fileURLToPath(new URL(rel, root));
const yd = JSON.parse(await readFile(p('src/data/yd.json'), 'utf8'));

// 1. Globe textures: WebP at full and half resolution. Small screens load the 2k set.
const tex = [
  ['day', 4096, 82],
  ['night', 4096, 80],
  ['clouds', 2048, 78],
  ['bump', 2048, 80],
  ['water', 2048, 80],
];
for (const [name, w, q] of tex) {
  const src = p(`assets-src/textures/${name}.jpg`);
  await sharp(src).resize(w, w / 2).webp({ quality: q }).toFile(p(`public/textures/${name}-${w / 1024}k.webp`));
  if (w === 4096) await sharp(src).resize(2048, 1024).webp({ quality: q }).toFile(p(`public/textures/${name}-2k.webp`));
}

// 2. Dotted land map for the journey section, sampled from the country-id texture.
//    Countries he has filmed print darker, like an inked map.
const visited = new Set([...Object.keys(yd.visits.countries), ...Object.keys(yd.visits.territories || {}), 'ATA']);
const idxVisited = new Uint8Array(256);
for (const m of yd.meta) if (visited.has(m[1])) idxVisited[m[0]] = 1;

const id = await sharp(p('assets-src/textures/id.png')).raw().toBuffer({ resolveWithObject: true });
const { width: IW, height: IH, channels: IC } = id.info;
const sample = (lon, lat) => {
  const x = Math.min(IW - 1, Math.max(0, Math.floor(((lon + 180) / 360) * IW)));
  const y = Math.min(IH - 1, Math.max(0, Math.floor(((90 - lat) / 180) * IH)));
  return id.data[(y * IW + x) * IC];
};

// Projection shared with the Journey component: lon -180..180, lat 84..-72.
// Each row of land becomes one line drawn with a round-capped zero-length dash:
// a halftone dot map in a few KB of vector instead of a 200 KB raster.
const MAP = { W: 1440, LAT_TOP: 84, LAT_BOT: -72 };
const H = Math.round((MAP.W * (MAP.LAT_TOP - MAP.LAT_BOT)) / 360);
const STEP = 1.8; // degrees between dots
const PITCH = (STEP / 360) * MAP.W;
const runs = { on: '', off: '' };
let n = 0;
for (let lat = MAP.LAT_TOP - STEP / 2; lat > MAP.LAT_BOT; lat -= STEP) {
  const y = (((MAP.LAT_TOP - lat) / (MAP.LAT_TOP - MAP.LAT_BOT)) * H).toFixed(1);
  let cur = null, startX = 0, count = 0;
  const flush = () => {
    if (cur === null) return;
    runs[cur] += `M${startX.toFixed(1)} ${y}h${((count - 1) * PITCH).toFixed(1)}`;
    cur = null;
  };
  let col = 0;
  for (let lon = -180 + STEP / 2; lon < 180; lon += STEP, col++) {
    let idx = sample(lon, lat);
    if (!idx) for (const [dx, dy] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { idx = sample(lon + dx, lat + dy); if (idx) break; }
    const kind = idx ? (idxVisited[idx] ? 'on' : 'off') : null;
    if (kind !== cur) {
      flush();
      if (kind) { cur = kind; startX = (col + 0.5) * PITCH; count = 0; }
    }
    if (kind) { count++; n++; }
  }
  flush();
}
await writeFile(
  p('src/data/dots.json'),
  JSON.stringify({ W: MAP.W, H, LAT_TOP: MAP.LAT_TOP, LAT_BOT: MAP.LAT_BOT, pitch: +PITCH.toFixed(3), on: runs.on, off: runs.off }),
);
console.log(`dots: ${n}; path bytes on=${runs.on.length} off=${runs.off.length}`);
