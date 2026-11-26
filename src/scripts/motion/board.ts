// Split-flap departures board. Each tile riffles through characters and settles,
// left to right, the way an airport board updates.
import { ScrollTrigger, motionOK, $$ } from './core';

const DIGITS = '0123456789';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SYMS = '.+-/';

function charsetFor(c: string) {
  if (DIGITS.includes(c)) return DIGITS;
  if (LETTERS.includes(c.toUpperCase())) return LETTERS;
  return SYMS + DIGITS;
}

function flip(row: HTMLElement, delay = 0) {
  const tiles = $$('.flap > span', row);
  const target = [...(row.dataset.flap || '')];
  tiles.forEach((span, j) => {
    const final = target[j] ?? '';
    const set = charsetFor(final);
    const ticks = 5 + j * 2 + Math.floor(Math.random() * 3);
    let k = 0;
    const tile = span.parentElement!;
    const step = () => {
      k++;
      span.textContent = k >= ticks ? final : set[(Math.random() * set.length) | 0];
      tile.classList.remove('tick');
      void tile.offsetWidth; // restart the flick animation
      tile.classList.add('tick');
      if (k < ticks) setTimeout(step, 46 + Math.random() * 22);
    };
    setTimeout(step, delay + j * 40);
  });
}

export function initBoard() {
  const rows = $$('[data-flap]');
  if (!rows.length || !motionOK()) return;
  // Start blank so the riffle reads as an update, not a flicker
  for (const r of rows) for (const s of $$('.flap > span', r)) s.textContent = ' ';
  ScrollTrigger.create({
    trigger: rows[0].closest('section')!,
    start: 'top 82%',
    once: true,
    onEnter: () => rows.forEach((r, i) => flip(r, i * 110)),
  });
}
