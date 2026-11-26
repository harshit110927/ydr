# Yatri Doctor · यात्री डॉक्टर

**177 of 197 countries, on an Indian passport.** A concept site for Navankur Chaudhary's Hindi travel channel. It includes a live WebGL Earth that lights up every country he has filmed in the order he filmed it, a scroll-drawn route from Delhi to Kabul, and a page for each of the 179 places in his videos.

> Unaffiliated concept site. Counts were checked against his public YouTube, Instagram and Graphy pages on 21 Nov 2026.

`docs/STUDY.md` covers the research behind the rebuild: what the $20k studio tier buys, and a gap analysis of the original single-file page.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 7**, static output | Every page is plain HTML at build time with zero JS by default. Crawlers and LLM fetchers see everything without running scripts. |
| Motion | **GSAP 3.15** (ScrollTrigger, SplitText, ScrambleText) + **Lenis** | Industry-standard scroll choreography. All of GSAP is free for commercial use since 2025. Lenis runs on GSAP's ticker, so smooth scroll and ScrollTrigger never disagree. |
| 3D | **three.js** | The globe: custom shaders for live sunlight, night lights, clouds, ocean glint and a country-ID lookup. Loads after first paint and only where WebGL is GPU-accelerated. |
| Maps | **d3-geo + topojson** at build time | Halftone route map and per-country orthographic globes render to SVG during the build. No map JS ships to the browser. |
| Hosting | Any static host | `dist/` is plain files. `public/_headers` carries cache rules for Netlify and Cloudflare Pages. |

## Commands

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run check
```

`npm run check` type-checks all TypeScript. To build for another domain, set `SITE_URL=https://example.com npm run build`. Canonicals, the sitemap, JSON-LD and `llms.txt` all follow it.

Asset pipelines, run only when their inputs change:

- `npm run assets`: regenerates the WebP globe textures (4k, plus 2k for phones) and the halftone dot map (`src/data/dots.json`) from `assets-src/` and the visit data.
- `npm run poster` / `npm run og`: re-capture the hero globe still and the 1200×630 social card from a running preview. Both need Playwright.

## Structure

```
src/
  data/            yd.json (visits, episodes, series), topo.json (country shapes), dots.json
  lib/             data.ts (typed dataset), site.ts (facts + "as of" date), schema.ts (JSON-LD),
                   faq.ts (FAQ copy, shared by page + schema), ortho.ts (build-time globe SVG)
  components/      Nav, Footer, Stamp, OrthoGlobe, home/* sections
  pages/           index, countries/index, countries/[slug] (179 pages), 404,
                   llms.txt, llms-full.txt, robots.txt, data/globe.json
  scripts/
    main.ts        entry; every module self-skips when its markup isn't on the page
    motion/        core (tokens, Lenis), reveals, nav, hero, board, about, journey, course, watch, pointer, footer
    globe/         Globe.ts (three.js, ported from the original build), app.ts (UI), shaders.ts, support.ts
  styles/          global.css (tokens, base), sections.css
assets-src/        source textures (not deployed)
scripts/           asset, poster and OG generators
```

## Motion system

One language, defined once (`src/scripts/motion/core.ts` and the CSS custom properties in `global.css`):

- **Eases:** `expo.out` for reveals, `power3.inOut` for travel. Overshoot is reserved for impacts, which means the passport stamps.
- **Durations:** 0.2s micro, 0.45s UI, 1.1s reveal. Stagger is 0.08s for lines and 0.022s for characters.

| Moment | What happens |
|---|---|
| Hero | The counter runs 0 → 177, widening along the font's width axis. It shares one clock with the globe, which lights countries in the order he first filmed them. The MRZ lines type in like a passport reader. The headline blurs into focus and stays painted from the first frame, so it is the LCP element. |
| Departures board | Each stat riffles through characters on split-flap tiles and settles left to right. |
| The doctor | The latest episode opens out of a mask while its still drifts. A muted 15-second loop plays once it's in view. |
| The route | Scroll draws great-circle legs across a halftone map (vector, about 10 KB). A plane rides the tip of the line, stops ping as they're reached, the year rolls like an odometer, coordinates scramble and each stamp slams down. The leg across the antimeridian is split at the map edge. |
| The globe | Drag, zoom and search. The camera flies between countries, and each country's panel links to its file. |
| The course | The boarding pass feeds out of a kiosk slot, the barcode is scanned, and the pass tilts toward the pointer. |
| The films | Two reels of his most-watched frames drift in opposite directions. Scroll speed pushes them, and hovering slows them to a crawl. List rows trail a thumbnail under the cursor. |
| Global | Magnetic buttons, contextual cursor labels, a nav that hides while you read, a progress hairline, a circular-reveal mobile menu, a letter-by-letter footer wordmark, and cross-document view transitions (a country's name morphs from the index into its page). |

**Reduced motion** turns everything off. The route draws complete, stamps are already down and content is visible without JS. A failsafe in `<head>` drops the motion class if the motion bundle hasn't arrived within 3.5s, so nothing can stay hidden.

**Performance guard.** The globe only starts where WebGL is GPU-accelerated. Software rasterisers (SwiftShader, llvmpipe) get the still poster instead and never download the 150 KB three.js chunk. Add `?gl=force` to the URL to override.

## SEO, AEO and GEO

- **179 country pages** built from his real upload data. Each opens with a direct answer to the question people type ("Has Yatri Doctor been to Japan? *Yes.* He first filmed Japan in…"). The rest is facts, every trip and every episode with its thumbnail, his own quotes, region neighbours, and previous/next country in visit order.
- **JSON-LD graph** with stable `@id`s: `WebSite`, `ProfilePage` → `Person` (with `sameAs`, `knowsAbout`, interaction counts), `Course` + `Offer`, `FAQPage` (generated from the same array as the visible FAQ), `VideoObject`, `ItemList`, `CollectionPage`, `BreadcrumbList` and `Country`/`Place` with coordinates.
- **`/llms.txt`** gives a fact sheet and a page per country. **`/llms-full.txt`** gives every episode by country, with dates and view counts.
- **`/robots.txt`** names the major AI search and answer crawlers explicitly and keeps `/data/` out of the index.
- Sitemap (181 URLs), canonicals, OG and Twitter cards, a 1200×630 social image, favicon set, web manifest and a 404 page.
- Every number carries its "as of" date, and all of them come from one place (`src/lib/site.ts`).

Lighthouse (v13, simulated throttling) in this container, which has no GPU:

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Home, mobile | 98 | 100 | 100 | 100 |
| Home, desktop | 100 | 100 | 100 | 100 |
| Country page (Japan, 54 episodes), mobile | 96 | 100 | 100 | 100 |
| Countries index, mobile | 96 | 100 | 100 | 100 |

Home-page LCP is 1.0s on mobile and 0.3s on desktop, and CLS is 0 to 0.002. On a GPU-less machine the home page keeps the globe still and skips three.js, which is the path these scores measure. On real GPUs the live globe starts after first paint.

Caveats: `llms.txt` is a community proposal with no published evidence that it changes citations. Google limits FAQ rich results to authoritative sites, but answer engines still parse the markup.

## Updating the data

1. Edit `src/data/yd.json` (visits, trips, episodes) and the facts in `src/lib/site.ts`, including `asOf`.
2. If visited countries changed, run `npm run assets` to re-print the dot map.
3. Run `npm run build`. Country pages, `llms.txt`, the sitemap and the globe data all regenerate.
