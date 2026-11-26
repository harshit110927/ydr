// About: the latest film opens out of a mask as it scrolls in, with the still drifting
// inside the frame. Once visible, a muted 15-second loop of the episode plays over it.
import { gsap, EASE, motionOK, $ } from './core';

type YTPlayer = {
  mute(): void; unMute(): void; setVolume(v: number): void; playVideo(): void; pauseVideo(): void;
  seekTo(s: number, a: boolean): void; getCurrentTime(): number;
  loadVideoById(o: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
};
type YTNamespace = { Player: new (el: string, o: object) => YTPlayer; PlayerState: { PLAYING: number; ENDED: number } };
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

function loadYT(): Promise<YTNamespace> {
  return new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('timeout')), 12000);
  });
}

export function initAbout() {
  const fig = $('#latest');
  if (!fig) return;
  const media = $('[data-reveal-media]', fig)!;
  const poster = $<HTMLImageElement>('.latest-poster', fig);

  // maxresdefault doesn't exist for every upload; YouTube answers with a 120px placeholder
  if (poster) {
    const useFallback = () => { if (poster.dataset.fallback) { poster.removeAttribute('srcset'); poster.src = poster.dataset.fallback; } };
    const fix = () => { if (poster.naturalWidth && poster.naturalWidth <= 120) useFallback(); };
    poster.addEventListener('load', fix);
    poster.addEventListener('error', useFallback);
    if (poster.complete) fix();
  }

  if (motionOK()) {
    gsap.fromTo(media, { clipPath: 'inset(12% 10% 12% 10% round 18px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none',
      scrollTrigger: { trigger: media, start: 'top 92%', end: 'top 40%', scrub: 0.6 },
    });
    if (poster) gsap.fromTo(poster, { yPercent: -5, scale: 1.12 }, {
      yPercent: 5, scale: 1, ease: 'none',
      scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  // Muted background loop of the newest episode (skipped for reduced motion)
  const id = fig.dataset.video!;
  const start = Number(fig.dataset.start) || 0;
  const end = Number(fig.dataset.end) || start + 15;
  const btn = $<HTMLButtonElement>('#latest-sound');
  let player: YTPlayer | null = null;
  let inView = false;
  let sound = false;
  let started = false;

  btn?.addEventListener('click', () => {
    if (!player) return;
    sound = !sound;
    if (sound) {
      player.loadVideoById({ videoId: id, startSeconds: Math.floor(player.getCurrentTime() || start) });
      player.unMute();
      player.setVolume(80);
    } else {
      player.loadVideoById({ videoId: id, startSeconds: start, endSeconds: end });
      player.mute();
    }
    btn.setAttribute('aria-pressed', String(sound));
    btn.textContent = sound ? 'Turn sound off' : 'Turn sound on';
  });

  if (!motionOK()) return;
  const boot = () =>
    loadYT()
      .then((YT) => {
        const vars: Record<string, unknown> = { autoplay: 1, mute: 1, controls: 0, start, end, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0, enablejsapi: 1 };
        if (/^https?:/.test(location.protocol)) vars.origin = location.origin;
        player = new YT.Player('latest-player', {
          host: 'https://www.youtube-nocookie.com',
          videoId: id,
          playerVars: vars,
          events: {
            onReady: (ev: { target: YTPlayer }) => {
              ev.target.mute();
              if (inView) ev.target.playVideo();
              setInterval(() => { try { if (!sound && ev.target.getCurrentTime() >= end - 0.25) ev.target.seekTo(start, true); } catch { /* player gone */ } }, 250);
            },
            onStateChange: (ev: { data: number; target: YTPlayer }) => {
              if (ev.data === YT.PlayerState.PLAYING) { fig.classList.add('playing'); if (btn) btn.hidden = false; }
              if (ev.data === YT.PlayerState.ENDED && !sound) { ev.target.seekTo(start, true); ev.target.playVideo(); }
            },
            onError: () => { fig.classList.remove('playing'); if (btn) btn.hidden = true; },
          },
        });
      })
      .catch(() => {});

  new IntersectionObserver(([en]) => {
    inView = en.isIntersecting;
    if (inView && !started) { started = true; boot(); }
    if (!player) return;
    if (inView) { if (!sound) player.mute(); player.playVideo(); } else player.pauseVideo();
  }, { threshold: 0.35 }).observe(fig);
}

export { EASE };
