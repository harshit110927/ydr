// Globe UI: search, tooltip, details panel, and the hand-off of one WebGL canvas
// between the hero (ambient, slowly turning) and the explorer (drag, zoom, select).
import { Globe, type CountryState } from './Globe';
import { forcedGL, showGlobeFallback } from './support';
import type { Topology } from 'topojson-specification';

type PlaceLite = {
  c: string; s: string; n: string; st: number; f: string; t: number; e: number;
  top: [string, string, string, number][]; q?: [string, string]; sr: [string, string][];
};
type GlobeData = { meta: [number, string, string, string, string, number, number, number, number][]; places: PlaceLite[]; topo: Topology; hisCount: number; total: number };

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s);
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = (d: string) => `${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const day = (d: string) => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const views = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`);

export async function initGlobe() {
  const heroStage = $('#stage-hero');
  const exploreStage = $('#stage-globe');
  if (!heroStage && !exploreStage) return;
  const fallback = showGlobeFallback;
  if (!Globe.supported(forcedGL())) return fallback();

  const data: GlobeData = await fetch('/data/globe.json').then((r) => r.json());
  const small = Math.min(screen.width, screen.height) < 820;
  const k = small ? '2k' : '4k';
  const tex = {
    day: `/textures/day-${k}.webp`,
    night: `/textures/night-${k}.webp`,
    clouds: '/textures/clouds-2k.webp',
    bump: '/textures/bump-2k.webp',
    water: '/textures/water-2k.webp',
    id: '/textures/id.png',
  };

  // Index the polygons: the largest polygon per ISO code carries the name and label point.
  const meta = data.meta.map(([i, code, name, region, , lx, ly, km2]) => ({ i, code, name, region, lx, ly, km2 }));
  const byIdx = new Map(meta.map((m) => [m.i, m]));
  const largest = new Map<string, (typeof meta)[number]>();
  for (const m of meta) { const cur = largest.get(m.code); if (!cur || m.km2 > cur.km2) largest.set(m.code, m); }
  const places = new Map(data.places.map((p) => [p.c, p]));
  const ordered = [...data.places].sort((a, b) => a.f.localeCompare(b.f));
  const orderOf = new Map(ordered.map((p, i) => [p.c, 0.02 + 0.96 * (i / Math.max(1, ordered.length - 1))]));

  const states: CountryState[] = meta
    .filter((m) => places.has(m.code))
    .map((m) => ({ i: m.i, status: places.get(m.code)!.st, order: orderOf.get(m.code)!, small: largest.get(m.code) === m && m.km2 < 3e4, lx: m.lx, ly: m.ly }));

  const describe = (idx: number) => {
    const m = byIdx.get(idx);
    if (!m) return null;
    const p = places.get(m.code);
    if (!p) return { name: m.name, line: 'Not in his videos yet', m, p: null as PlaceLite | null };
    const line =
      p.st === 3 ? `Home country. ${p.e} episodes filmed here`
      : p.st === 2 ? `Territory he filmed, ${month(p.f)}`
      : p.st === 4 ? `His seventh continent, ${month(p.f)}`
      : `First filmed ${month(p.f)}. ${p.e} episode${p.e === 1 ? '' : 's'}`;
    return { name: p.n, line, m, p };
  };

  // Tooltip
  const tip = $('#g-tip');
  const showTip = (idx: number, e?: PointerEvent) => {
    if (!tip) return;
    if (!idx || !e || e.pointerType === 'touch') { tip.hidden = true; return; }
    const d = describe(idx);
    if (!d) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${esc(d.name)}</b><span>${esc(d.line)}</span>`;
    const r = tip.parentElement!.getBoundingClientRect();
    tip.style.left = `${e.clientX - r.left}px`;
    tip.style.top = `${e.clientY - r.top}px`;
    tip.hidden = false;
  };

  // Details panel
  const panel = $('#g-panel');
  const body = $('#g-panel-body');
  const closePanel = () => { if (panel) { panel.hidden = true; panel.parentElement!.classList.remove('has-panel'); } };
  const openPanel = (idx: number) => {
    const d = idx ? describe(idx) : null;
    if (!d || !panel || !body) return closePanel();
    if (tip) tip.hidden = true;
    let h = `<h3>${esc(d.name)}</h3><p class="p-status">${esc(d.line)}</p>`;
    if (d.p) {
      const p = d.p;
      h += `<dl><dt>First filmed</dt><dd>${day(p.f)}</dd><dt>Trips</dt><dd>${p.t}</dd><dt>Episodes</dt><dd>${p.e}</dd></dl>`;
      if (p.q) h += `<blockquote>${esc(p.q[0])}<br><a href="https://www.youtube.com/watch?v=${esc(p.q[1])}" target="_blank" rel="noopener">From the episode</a></blockquote>`;
      if (p.top.length)
        h += '<ul>' + p.top.map(([id, date, title, v]) =>
          `<li><a href="https://www.youtube.com/watch?v=${esc(id)}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${esc(id)}/mqdefault.jpg" alt="" loading="lazy" width="320" height="180"><span class="ep-t">${esc(title)}</span><span class="ep-m">${day(date)}${v ? `, ${views(v)} views` : ''}</span></a></li>`).join('') + '</ul>';
      h += `<p class="p-links"><a class="p-file" href="/countries/${esc(p.s)}/">Open the ${esc(p.n)} file →</a>`;
      h += p.sr.slice(0, 2).map(([id, name]) => `<a href="https://www.youtube.com/playlist?list=${esc(id)}" target="_blank" rel="noopener">${esc(name)} series</a>`).join('');
      h += '</p>';
    } else {
      h += `<p>He has ${data.total - data.hisCount} countries left to reach all ${data.total}, by his count.</p>`;
    }
    body.innerHTML = h;
    panel.hidden = false;
    panel.parentElement!.classList.add('has-panel');
  };

  const globe = new Globe(tex, data.topo, {
    onHover: (idx, e) => { showTip(idx, e); if (exploreStage) exploreStage.style.cursor = idx ? 'pointer' : ''; },
    onSelect: openPanel,
  });
  $('#g-close')?.addEventListener('click', () => { closePanel(); globe.select(0); });

  const flyToCode = (code: string) => {
    const m = largest.get(code);
    if (!m || !exploreStage) return;
    globe.mount(exploreStage, 'explore');
    globe.flyTo(m.ly, m.lx, m.km2 > 3e6 ? 3.1 : m.km2 > 4e5 ? 2.5 : 2.05);
    globe.select(m.i);
    openPanel(m.i);
  };

  // Search
  const list = $('#country-list');
  const input = $<HTMLInputElement>('#country-search');
  const all = [...largest.values()].filter((m) => m.code !== 'ATA').sort((a, b) => a.name.localeCompare(b.name));
  if (list) list.innerHTML = all.map((m) => `<option value="${esc(m.name)}"></option>`).join('');
  const search = () => {
    const q = input?.value.trim().toLowerCase();
    if (!q) return;
    const hit = all.find((m) => m.name.toLowerCase() === q) || all.find((m) => m.name.toLowerCase().startsWith(q)) || all.find((m) => m.name.toLowerCase().includes(q));
    if (hit) flyToCode(hit.code);
  };
  input?.addEventListener('change', search);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } });

  try {
    await globe.init();
  } catch (err) {
    console.warn('globe init failed', err);
    return fallback();
  }
  globe.setCountries(states);
  const startStage = heroStage || exploreStage!;
  globe.mount(startStage, heroStage ? 'hero' : 'explore');
  heroStage?.closest('.hero')?.classList.add('globe-live');

  const vis = { hero: false, globe: false };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) vis[en.target === heroStage ? 'hero' : 'globe'] = en.isIntersecting;
    if (vis.globe && exploreStage) globe.mount(exploreStage, 'explore');
    else if (vis.hero && heroStage) globe.mount(heroStage, 'hero');
    globe.setVisible(vis.hero || vis.globe);
  });
  if (heroStage) io.observe(heroStage);
  if (exploreStage) io.observe(exploreStage);
  addEventListener('resize', () => globe.resize());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) globe.setVisible(globe.visible); });

  const live = $<HTMLInputElement>('#t-live');
  const clouds = $<HTMLInputElement>('#t-clouds');
  const spin = $<HTMLInputElement>('#t-spin');
  live?.addEventListener('change', () => (globe.live = live.checked));
  clouds?.addEventListener('change', () => (globe.cloudsOn = clouds.checked));
  if (spin) {
    spin.checked = globe.spin;
    spin.addEventListener('change', () => { globe.spin = spin.checked; if (spin.checked) globe.interacted = false; });
  }

  const note = $('#live-note');
  const time = $('#live-time');
  if (note && time) {
    time.textContent = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date());
    note.hidden = false;
  }

  // Hand the globe to whoever owns the reveal clock (the hero counter); otherwise light it now.
  window.dispatchEvent(new CustomEvent('globe:ready', { detail: globe }));
  if (!document.documentElement.classList.contains('motion') || !heroStage) globe.reveal(heroStage ? 0.01 : 3);

  // Deep link: /#globe?c=JPN style or ?country=JPN
  const q = new URLSearchParams(location.search).get('country');
  if (q && places.has(q.toUpperCase())) flyToCode(q.toUpperCase());
}
