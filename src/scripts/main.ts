// Entry point for every page. Modules self-skip when their markup isn't present,
// and every animation has a static fallback for reduced motion.
import { initSmoothScroll, ScrollTrigger, motionOK, finePointer, $ } from './motion/core';
import { initReveals } from './motion/reveals';
import { initNav } from './motion/nav';
import { initHero } from './motion/hero';
import { initBoard } from './motion/board';
import { initAbout } from './motion/about';
import { initJourney } from './motion/journey';
import { initCourse } from './motion/course';
import { initReel, initScramble } from './motion/watch';
import { initPointer } from './motion/pointer';
import { initFooter } from './motion/footer';
import { initCountryIndex } from './pages/countries';
import { inkGrain, guilloche, filmGrain } from './textures';
import { fastWebGL, forcedGL, showGlobeFallback } from './globe/support';

declare global { interface Window { __ydMotion?: boolean } }
window.__ydMotion = true;

const idle = (fn: () => void, timeout = 1200) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200);

inkGrain(); // stamps need it immediately
initSmoothScroll();
initNav();
initHero();
initBoard();
initAbout();
initJourney();
initCourse();
initReel();
initScramble();
initReveals();
initFooter();
initPointer();
initCountryIndex();

idle(() => {
  guilloche();
  if (motionOK() && finePointer() && innerWidth > 1024) {
    filmGrain();
    document.documentElement.classList.add('has-grain');
  }
});

// The globe (three.js + textures) loads after first paint, only on pages that have a stage.
// Devices without fast WebGL skip the 150 KB three.js chunk entirely and keep the stills.
if ($('#stage-hero') || $('#stage-globe')) {
  const boot = () =>
    fastWebGL(forcedGL())
      ? import('./globe/app').then((m) => m.initGlobe()).catch((err) => console.warn('globe', err))
      : showGlobeFallback();
  if (document.readyState === 'complete') idle(boot, 600);
  else addEventListener('load', () => idle(boot, 600), { once: true });
}

// Layout can shift once web fonts land; re-measure scroll positions.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
