// Countries index: instant filter across names, regions and years.
import { ScrollTrigger, $, $$ } from '../motion/core';

export function initCountryIndex() {
  const input = $<HTMLInputElement>('[data-ci-filter]');
  if (!input) return;
  const items = $$<HTMLLIElement>('[data-ci-item]');
  const groups = $$<HTMLElement>('[data-ci-region]');
  const count = $('[data-ci-count]');
  const total = items.length;
  const run = () => {
    const q = input.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let shown = 0;
    for (const li of items) {
      const hit = !q || (li.dataset.ciItem || '').includes(q);
      li.hidden = !hit;
      if (hit) shown++;
    }
    for (const g of groups) g.hidden = !g.querySelector('[data-ci-item]:not([hidden])');
    if (count) count.textContent = q ? `${shown} of ${total}` : `${total} places`;
    ScrollTrigger.refresh();
  };
  input.addEventListener('input', run);
}
