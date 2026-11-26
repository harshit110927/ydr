// Pointer layer (fine pointers only): magnetic buttons, a contextual cursor label,
// and a thumbnail that trails the cursor over episode lists.
import { gsap, EASE, motionOK, finePointer, $, $$ } from './core';

const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export function initPointer() {
  if (!finePointer() || !motionOK()) return;

  // Magnetic buttons
  for (const el of $$('[data-magnetic]')) {
    const inner = el.firstElementChild as HTMLElement | null;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: EASE.out });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: EASE.out });
    const ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.7, ease: EASE.out }) : null;
    const iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.7, ease: EASE.out }) : null;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.28); yTo(dy * 0.36);
      ixTo?.(dx * 0.12); iyTo?.(dy * 0.16);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); ixTo?.(0); iyTo?.(0); });
  }

  // Cursor label
  const cursor = $('.cursor');
  const label = cursor ? $('span', cursor) : null;
  const cx = cursor ? gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' }) : null;
  const cy = cursor ? gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' }) : null;

  // Trailing preview
  const preview = $('.preview');
  const pimg = preview ? $<HTMLImageElement>('img', preview) : null;
  const px = preview ? gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3.out' }) : null;
  const py = preview ? gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3.out' }) : null;
  const prot = preview ? gsap.quickTo(preview, 'rotation', { duration: 0.6, ease: 'power3.out' }) : null;
  let lastX = 0;

  let overCursor: HTMLElement | null = null;
  let overPreview: HTMLElement | null = null;

  window.addEventListener('pointermove', (e) => {
    const t = e.target as Element;
    // cursor label
    const c = t.closest?.('[data-cursor]') as HTMLElement | null;
    if (c !== overCursor) {
      overCursor = c;
      if (c && label) label.textContent = c.dataset.cursor || '';
      cursor?.classList.toggle('on', !!c);
    }
    if (cursor) {
      if (!overCursor) gsap.set(cursor, { x: e.clientX, y: e.clientY });
      cx?.(e.clientX); cy?.(e.clientY);
    }
    // preview
    const pv = t.closest?.('[data-preview]') as HTMLElement | null;
    const id = pv?.dataset.preview;
    if (pv !== overPreview) {
      overPreview = pv;
      if (pv && id && pimg) {
        const src = thumbUrl(id);
        if (pimg.src !== src) pimg.src = src;
        if (!preview!.classList.contains('on')) gsap.set(preview!, { x: e.clientX + 24, y: e.clientY - 80 });
      }
      preview?.classList.toggle('on', !!(pv && id));
    }
    if (preview && overPreview) {
      const vx = e.clientX - lastX;
      px?.(e.clientX + 24); py?.(e.clientY - 80);
      prot?.(Math.max(-8, Math.min(8, vx * 0.6)));
    }
    lastX = e.clientX;
  }, { passive: true });

  document.addEventListener('pointerleave', () => {
    cursor?.classList.remove('on');
    preview?.classList.remove('on');
    overCursor = overPreview = null;
  });
}
