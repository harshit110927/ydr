// Footer: the wordmark rises letter by letter as you reach the end of the page.
import { gsap, SplitText, EASE, motionOK, $ } from './core';

export function initFooter() {
  const wm = $('[data-wordmark]');
  if (!wm || !motionOK()) return;
  const en = $('.wm-en', wm)!;
  const hi = $('.wm-hi', wm)!;
  SplitText.create(en, {
    type: 'chars',
    mask: 'chars',
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.chars, {
        yPercent: 110,
        duration: 1.2,
        ease: EASE.out,
        stagger: 0.045,
        scrollTrigger: { trigger: wm, start: 'top 95%', once: true },
      });
    },
  });
  gsap.from(hi, { opacity: 0, y: 20, duration: 1, ease: EASE.out, scrollTrigger: { trigger: wm, start: 'top 95%', once: true } });
}
