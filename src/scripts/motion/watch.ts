// Watch: two rows of his most-watched frames drift in opposite directions.
// Scroll speed feeds the drift (the reel "catches" your scroll); hovering slows it to a crawl.
import { gsap, ScrollTrigger, getLenis, motionOK, $, $$ } from './core';

export function initReel() {
  const reel = $('[data-reel]');
  if (!reel || !motionOK()) return;
  const rows = $$('[data-reel-row]', reel);
  const tweens: gsap.core.Tween[] = [];

  for (const row of rows) {
    const track = $('.reel-track', row)!;
    // Duplicate the items once for a seamless loop; the copies are hidden from AT and tab order.
    for (const li of [...track.children]) {
      const c = li.cloneNode(true) as HTMLElement;
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
      track.appendChild(c);
    }
    const dir = Number(row.dataset.dir) || -1;
    const tw = dir < 0
      ? gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, duration: 70, ease: 'none', repeat: -1 })
      : gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: 70, ease: 'none', repeat: -1 });
    tweens.push(tw);
  }

  let boost = 1;
  let hover = false;
  let speed = 1;
  const lenis = getLenis();
  lenis?.on('scroll', ({ velocity }: { velocity: number }) => { boost = 1 + Math.min(6, Math.abs(velocity) * 0.35); });
  reel.addEventListener('pointerenter', () => (hover = true));
  reel.addEventListener('pointerleave', () => (hover = false));

  const tick = () => {
    const target = hover ? 0.15 : boost;
    speed += (target - speed) * 0.08;
    boost += (1 - boost) * 0.05;
    for (const t of tweens) t.timeScale(speed);
  };
  ScrollTrigger.create({
    trigger: reel,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (st) => {
      if (st.isActive) { tweens.forEach((t) => t.play()); gsap.ticker.add(tick); }
      else { tweens.forEach((t) => t.pause()); gsap.ticker.remove(tick); }
    },
  });
  tweens.forEach((t) => t.pause());
}

/** Coordinates in the "edges" list scramble when hovered, like a receiver locking on. */
export function initScramble() {
  if (!motionOK()) return;
  for (const el of $$('[data-scramble]')) {
    const text = el.textContent || '';
    el.closest('a')?.addEventListener('pointerenter', () => {
      gsap.to(el, { duration: 0.7, scrambleText: { text, chars: '0123456789°′NSEW', speed: 0.9 }, overwrite: true });
    });
  }
}
