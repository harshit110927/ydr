// Journey: scroll draws the flight path leg by leg across the halftone map.
// A plane rides the tip of the line, stops ping as they're reached, the year rolls
// like an odometer and each passport stamp slams down on its card.
import { gsap, ScrollTrigger, EASE, motionOK, $, $$ } from './core';

export function initJourney() {
  const root = $('[data-journey]');
  if (!root) return;
  const items = $$('.tl-item', root);
  const list = $('[data-tl-list]', root)!;
  const stops = $$<SVGGElement>('[data-stop]', root);
  const plane = $<SVGGElement>('[data-plane]', root)!;
  const planeRot = $<SVGGElement>('.plane-rot', plane)!;
  const yearEl = $('[data-tl-year]', root)!;
  const placeEl = $('[data-tl-place]', root)!;
  const coordEl = $('[data-tl-coord]', root)!;

  // Group path segments by leg
  const legs: SVGPathElement[][] = [];
  for (const p of $$<SVGPathElement>('[data-leg]', root)) {
    const i = Number(p.dataset.leg);
    (legs[i] ||= []).push(p);
  }
  const lens = legs.map((segs) => segs.map((s) => s.getTotalLength()));
  const totals = lens.map((l) => l.reduce((a, b) => a + b, 0));

  if (!motionOK()) {
    // Static: whole route drawn, every stop on, every stamp down.
    stops.forEach((s) => s.classList.add('on'));
    items.forEach((it) => it.classList.add('in'));
    list.style.setProperty('--p', '1');
    const last = items[items.length - 1];
    yearEl.innerHTML = `<span>${last.dataset.year}</span>`;
    placeEl.textContent = last.dataset.place || '';
    coordEl.textContent = last.dataset.coord || '';
    return;
  }

  legs.forEach((segs, i) => segs.forEach((s, j) => { s.style.strokeDasharray = `${lens[i][j]} ${lens[i][j]}`; s.style.strokeDashoffset = `${lens[i][j]}`; }));

  const drawn = new Array(legs.length).fill(0);
  const drawLeg = (k: number, p: number) => {
    drawn[k] = p;
    let remaining = p * totals[k];
    let tip: DOMPoint | null = null;
    let dir: DOMPoint | null = null;
    legs[k].forEach((seg, j) => {
      const L = lens[k][j];
      const show = Math.max(0, Math.min(L, remaining));
      seg.style.strokeDashoffset = String(L - show);
      if (remaining > 0 && remaining <= L + 0.001) {
        tip = seg.getPointAtLength(show);
        dir = seg.getPointAtLength(Math.max(0, show - 6));
      }
      remaining -= L;
    });
    // Plane rides the newest leg being drawn
    const active = drawn.findLastIndex((d) => d > 0 && d < 1);
    if (active === k && tip && dir) {
      const t = tip as DOMPoint, d = dir as DOMPoint;
      const ang = (Math.atan2(t.y - d.y, t.x - d.x) * 180) / Math.PI;
      plane.setAttribute('transform', `translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`);
      planeRot.setAttribute('transform', `rotate(${ang.toFixed(1)})`);
      plane.classList.add('on');
    } else if (active === -1) plane.classList.remove('on');
  };

  // Leg k draws as card k+1 travels from 85% to 52% of the viewport
  items.slice(1).forEach((item, idx) => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 85%',
      end: 'top 52%',
      scrub: 0.4,
      onUpdate: (st) => drawLeg(idx, st.progress),
    });
  });

  // Active stop: year odometer, scrambled place + coordinates, ping, stamp
  let current = -1;
  const activate = (i: number) => {
    if (i === current || i < 0) return;
    const prev = current;
    current = i;
    const it = items[i];
    stops.forEach((s, k) => s.classList.toggle('on', k <= i));
    const stop = stops[i];
    stop.classList.remove('ping'); void stop.getBoundingClientRect(); stop.classList.add('ping');

    const year = it.dataset.year || '';
    const old = yearEl.lastElementChild as HTMLElement | null;
    if (!old || old.textContent !== year) {
      const next = document.createElement('span');
      next.textContent = year;
      yearEl.appendChild(next);
      const dirn = i > prev ? 1 : -1;
      gsap.fromTo(next, { yPercent: 100 * dirn }, { yPercent: 0, duration: 0.8, ease: EASE.out });
      if (old) gsap.to(old, { yPercent: -100 * dirn, duration: 0.8, ease: EASE.out, onComplete: () => old.remove() });
    }
    gsap.to(placeEl, { duration: 0.7, scrambleText: { text: it.dataset.place || '', chars: 'upperCase', speed: 0.6, revealDelay: 0.1 } });
    gsap.to(coordEl, { duration: 0.9, scrambleText: { text: it.dataset.coord || '', chars: '0123456789.°NSEW', speed: 0.8 } });
  };

  items.forEach((item, i) => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 62%',
      onEnter: () => { item.classList.add('in'); activate(i); },
      onLeaveBack: () => activate(Math.max(0, i - 1)),
    });
  });
  activate(0);

  // Progress rail
  gsap.to(list, {
    '--p': 1,
    ease: 'none',
    scrollTrigger: { trigger: list, start: 'top 55%', end: 'bottom 55%', scrub: true },
  });
}
