// Procedural print textures, drawn once on canvas instead of shipped as images:
// the passport guilloche rosette, stamp-ink grain and film grain. Zero bytes over the wire.
const root = document.documentElement.style;

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function inkGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 220;
  const g = c.getContext('2d')!;
  const img = g.createImageData(220, 220);
  const rnd = seeded(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const a = rnd();
    img.data[i + 3] = a < 0.14 ? 70 + a * 600 : 255;
  }
  g.putImageData(img, 0, 0);
  root.setProperty('--ink-grain', `url(${c.toDataURL('image/png')})`);
}

export function guilloche() {
  const c = document.createElement('canvas');
  c.width = c.height = 1200;
  const g = c.getContext('2d')!;
  g.translate(600, 600);
  g.lineWidth = 0.8;
  g.strokeStyle = 'rgba(31, 79, 163, 0.10)';
  for (let o = 0; o < 22; o++) {
    g.beginPath();
    for (let a = 0; a <= 720; a++) {
      const t = (a / 720) * Math.PI * 2;
      const r = 300 + o * 9 + 46 * Math.sin(14 * t + o * 0.42) + 10 * Math.sin(56 * t - o * 0.2);
      const x = r * Math.cos(t), y = r * Math.sin(t);
      a ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  c.toBlob((b) => b && root.setProperty('--guilloche', `url(${URL.createObjectURL(b)})`), 'image/png');
}

export function filmGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d')!;
  const img = g.createImageData(160, 160);
  const rnd = seeded(13);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (rnd() * 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  root.setProperty('--film-grain', `url(${c.toDataURL('image/png')})`);
}
