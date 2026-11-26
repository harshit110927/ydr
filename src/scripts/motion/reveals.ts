// Scroll reveals: headings rise line by line out of masks; supporting copy fades up.
import { gsap, SplitText, EASE, DUR, STAGGER, $$ } from './core';

export function initReveals() {
  for (const el of $$('[data-split]')) {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      aria: 'auto',
      onSplit(self) {
        el.classList.add('is-split');
        return gsap.from(self.lines, {
          yPercent: 108,
          duration: DUR.reveal,
          ease: EASE.out,
          stagger: STAGGER.lines,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        });
      },
    });
  }

  for (const el of $$('[data-fade]')) {
    gsap.fromTo(
      el,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: DUR.reveal,
        ease: EASE.out,
        delay: 0.12,
        clearProps: 'transform',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      },
    );
  }
}
