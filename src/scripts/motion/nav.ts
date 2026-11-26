// Navigation: glass bar after the hero, hides while reading down, returns on the way up.
// Mobile menu is a full-screen passport-navy sheet with a focus trap.
import { ScrollTrigger, getLenis, scrollToTarget, $, $$ } from './core';

export function initNav() {
  const nav = $('[data-nav]');
  if (!nav) return;
  const bar = $('.nav-progress', nav);
  let lastY = window.scrollY;
  let menuOpen = false;

  const onScroll = (y: number) => {
    nav.classList.toggle('scrolled', y > 40);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar?.style.setProperty('--progress', String(max > 0 ? y / max : 0));
    if (!menuOpen) {
      const down = y > lastY + 4;
      const up = y < lastY - 4;
      if (down && y > innerHeight * 0.9) nav.classList.add('hidden');
      else if (up || y < innerHeight * 0.5) nav.classList.remove('hidden');
      // Sticky panels below the nav move up into its space while it's away
      document.documentElement.classList.toggle('nav-hidden', nav.classList.contains('hidden'));
    }
    lastY = y;
  };
  const lenis = getLenis();
  if (lenis) lenis.on('scroll', ({ scroll }: { scroll: number }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);
  nav.addEventListener('focusin', () => nav.classList.remove('hidden'));

  // Active section link
  const links = $$<HTMLAnchorElement>('[data-nav-link]');
  for (const a of links) {
    const id = a.hash?.slice(1);
    const sec = id ? document.getElementById(id) : null;
    if (!sec || !a.getAttribute('href')?.startsWith('#')) continue;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (st) => a.classList.toggle('active', st.isActive),
    });
  }

  // Same-page hash links glide instead of jumping
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a[href*="#"]') as HTMLAnchorElement | null;
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = url.hash === '#top' ? document.body : document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    if (menuOpen) closeMenu(false);
    scrollToTarget(url.hash === '#top' ? 0 : target, -64);
    history.replaceState(null, '', url.hash);
  });

  // Mobile menu
  const btn = $<HTMLButtonElement>('[data-menu-btn]');
  const menu = $('[data-menu]');
  if (!btn || !menu) return;
  const focusables = () => [btn, ...$$<HTMLElement>('a, button', menu)];
  const openMenu = () => {
    menuOpen = true;
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('open'));
    nav.classList.add('menu-open');
    nav.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    getLenis()?.stop();
    document.documentElement.style.overflow = 'hidden';
  };
  const closeMenu = (focusBtn = true) => {
    menuOpen = false;
    menu.classList.remove('open');
    nav.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    getLenis()?.start();
    document.documentElement.style.overflow = '';
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 800);
    if (focusBtn) btn.focus();
  };
  btn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  menu.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a');
    if (a && !a.hash) closeMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (!menuOpen) return;
    if (e.key === 'Escape') closeMenu();
    if (e.key === 'Tab') {
      const f = focusables();
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  matchMedia('(min-width: 961px)').addEventListener('change', (m) => { if (m.matches && menuOpen) closeMenu(false); });
}
