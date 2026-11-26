// Motion core: one GSAP instance, one Lenis instance, one set of tokens.
// Every module imports from here so eases and durations stay consistent site-wide.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

/** Tokens (mirrored as CSS custom properties in global.css). */
export const EASE = {
  out: 'expo.out', // reveals: fast start, long settle
  inOut: 'power3.inOut', // things that travel
  soft: 'power2.out', // UI feedback
  stamp: 'back.out(2.2)', // impacts only: the stamp landing
};
export const DUR = { micro: 0.2, ui: 0.45, reveal: 1.1, long: 1.6 };
export const STAGGER = { lines: 0.08, words: 0.04, chars: 0.022 };

export const motionOK = () => document.documentElement.classList.contains('motion');
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

/** Inertial scroll driven by GSAP's ticker, so ScrollTrigger and Lenis never disagree on position. */
export function initSmoothScroll() {
  if (!motionOK()) return null;
  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.2,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/** Scroll to an element or y, smoothly when Lenis runs, natively otherwise. */
export function scrollToTarget(target: string | HTMLElement | number, offset = -72) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (el === null) return;
  if (lenis) {
    lenis.scrollTo(el as HTMLElement | number, { offset, duration: 1.6, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
  } else if (typeof el === 'number') {
    window.scrollTo({ top: el, behavior: 'auto' });
  } else {
    el.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' });
  }
}

export { gsap, ScrollTrigger, SplitText };
