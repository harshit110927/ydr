// Hero: the 0→177 counter widens along the font's width axis while the globe lights
// countries in the order he first filmed them. Both run off one shared progress value.
import { gsap, ScrollTrigger, EASE, motionOK, $, $$ } from './core';

type GlobeLike = { setProgress(p: number): void; reveal(dur?: number): void };

const MRZ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';

export function initHero() {
  const hero = $('[data-hero]');
  const count = $('#hero-count');
  if (!hero || !count) return;
  const final = Number(count.dataset.final) || 177;

  if (!motionOK()) {
    count.textContent = String(final);
    return;
  }

  // Shared clock for counter + globe
  const state = { p: 0 };
  let globe: GlobeLike | null = null;
  let done = false;
  const apply = () => {
    const v = Math.round(final * state.p);
    count.textContent = String(v);
    count.style.fontStretch = `${75 + 50 * state.p}%`;
    globe?.setProgress(state.p);
  };
  apply();
  gsap.to(state, {
    p: 1,
    duration: 3.4,
    delay: 0.35,
    ease: 'power2.inOut',
    onUpdate: apply,
    onComplete() {
      done = true;
      count.style.fontStretch = '';
      count.classList.add('sheen');
      if (globe) globe.reveal(0.6); // let the gold flash settle
    },
  });
  window.addEventListener('globe:ready', (e) => {
    globe = (e as CustomEvent<GlobeLike>).detail;
    // Arrived late: replay the lighting quickly from zero rather than popping in.
    if (done) globe.reveal(2.4);
    else globe.setProgress(state.p);
  });

  // MRZ lines type in like a passport reader scanning the page
  for (const [li, line] of $$('[data-mrz-line]').entries()) {
    const text = line.textContent || '';
    const obj = { n: 0 };
    line.textContent = '';
    line.style.visibility = 'visible';
    gsap.to(obj, {
      n: text.length,
      duration: 1.6,
      delay: 1.0 + li * 0.35,
      ease: 'none',
      onUpdate() {
        const n = Math.floor(obj.n);
        const noise = Array.from({ length: Math.min(3, text.length - n) }, () => MRZ_CHARS[(Math.random() * MRZ_CHARS.length) | 0]).join('');
        line.textContent = text.slice(0, n) + noise;
      },
      onComplete() { line.textContent = text; },
    });
  }

  // Scroll-out: copy lifts away, the planet stays and grows slightly
  const copy = $('.hero-copy', hero);
  const stage = $('#stage-hero', hero);
  const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  tl.to(copy, { yPercent: -18, opacity: 0.15, ease: 'none' }, 0);
  if (stage) tl.to(stage, { scale: 1.08, ease: 'none' }, 0);
  tl.to($('[data-mrz]', hero), { yPercent: -120, opacity: 0, ease: 'none' }, 0);
  ScrollTrigger.refresh();
}

export { EASE };
