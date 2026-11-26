// Course: the boarding pass feeds out of a kiosk slot, then the barcode is scanned.
// On desktop it tilts toward the pointer like a card in the hand.
import { gsap, EASE, motionOK, finePointer, $ } from './core';

export function initCourse() {
  const slot = $('[data-pass]');
  if (!slot || !motionOK()) return;
  const pass = $('.pass', slot)!;
  const scan = $('.barcode .scan', slot);

  const tl = gsap.timeline({ scrollTrigger: { trigger: slot, start: 'top 78%', once: true } });
  tl.fromTo(pass,
    { clipPath: 'inset(0% 0% 100% 0% round 20px)', yPercent: -14, rotateX: 22, transformOrigin: '50% 0%' },
    { clipPath: 'inset(0% 0% 0% 0% round 20px)', yPercent: 0, rotateX: 0, duration: 1.5, ease: 'power3.out', clearProps: 'clipPath' });
  if (scan) {
    tl.set(scan, { opacity: 1, left: '0%' }, '-=0.2')
      .to(scan, { left: '100%', duration: 0.8, ease: 'power1.inOut' })
      .to(scan, { opacity: 0, duration: 0.2 }, '-=0.1');
  }

  if (!finePointer()) return;
  const rx = gsap.quickTo(pass, 'rotateX', { duration: 0.8, ease: EASE.out });
  const ry = gsap.quickTo(pass, 'rotateY', { duration: 0.8, ease: EASE.out });
  slot.addEventListener('pointermove', (e) => {
    const r = slot.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ry(x * 6);
    rx(-y * 5);
  });
  slot.addEventListener('pointerleave', () => { rx(0); ry(0); });
}
