# What a $20k site is, and what this one was missing

A working study written before the rebuild. It covers three things: what the
$15–30k band buys, the traits that separate those sites from a $3k template, and
a gap analysis of the existing Yatri Doctor concept page against those traits.
The plan that follows comes from the gaps.

## 1. The price band

Agency pricing is noisy, and most published figures are agency marketing, so
treat them as directional:

| Source (2026) | Band | What sits there |
|---|---|---|
| DesignRush budget guide | $5k–20k | Simple custom sites, redesigns, basic CMS |
| DesignRush budget guide | $20k–100k | Multi-page builds, integrations, design systems |
| Digitaleer | $12k–25k | Custom, conversion-focused SMB sites |
| Brandvm | $20k–60k | Corporate / B2B sites |
| Clutch | $2k–100k | Most reviewed projects come in under $10k |

So $20k is the floor of the *studio* tier. It is not the price of more pages. It
is the price of a team (strategist, art director, motion designer, creative
developer, SEO) spending 6–10 weeks on one idea. The client is paying for
**decisions and craft**, not for templates.

## 2. What the money visibly buys

From Awwwards SOTD patterns, studio portfolios (Locomotive, Immersive Garden,
Lusion, Obys, Active Theory) and the judging axes Awwwards uses (design,
usability, creativity, content):

1. **One idea, carried everywhere.** A concept (here: *the Indian passport*)
   that sets the palette, type, layout motifs, micro-copy and motion. Cheap
   sites decorate. Expensive sites have an argument.
2. **Typography as image.** Display type at poster scale, variable-font axes
   used expressively (width, weight), tight leading, real kerning, tabular
   figures for numbers. Text is often the hero, not a stock photo.
3. **Choreographed motion, not effects.** One motion language: a small set of
   eases and durations, staggered line reveals, scroll-*scrubbed* storytelling
   (pinned sections where scroll drives a narrative), and transitions that are
   objects moving, not fades. Smooth inertial scroll (Lenis / ScrollSmoother)
   is table stakes.
4. **A signature moment.** One piece people screenshot and share: a WebGL
   scene, a data visualisation, an interactive object. Here: the live globe.
5. **Real media, full-bleed.** Footage and photography carry the brand. A
   creator site without the creator's frames reads as a template.
6. **Tactile micro-interactions.** Magnetic buttons, cursor-following previews,
   hover states with intent, contextual cursor labels, satisfying "landing"
   moments (stamps, ticks, flips).
7. **Speed despite richness.** Text-first LCP, code-split WebGL, lazy media,
   fonts preloaded and subset. Lighthouse 90+ on mobile is part of the brief.
8. **Accessibility and restraint.** `prefers-reduced-motion` honoured
   everywhere, real focus states, keyboard paths, semantic HTML. Motion that
   blocks reading is a defect.
9. **Search, social and AI discoverability built in.** Complete metadata,
   JSON-LD entity graph, OG images, sitemap, crawlable deep pages that answer
   real questions, `llms.txt`. For a creator, the entity (*who is Yatri
   Doctor?*) must be unambiguous to Google and to LLMs.
10. **Finish.** 404 page, favicon set, selection colour, print and no-JS
    states, consistent "as of" dates on every number.

The motion-graphics reference repo (Barty-Bart/motion-graphics) is a set of
video-explainer skills, not web motion, but three of its rules carry over
directly and are adopted here:

- *Transitions are objects, not cuts.* Elements travel or transform into the
  next state; avoid cross-fades.
- *Springs with tiny overshoot at most.* No bouncy UI easing; overshoot is
  reserved for impacts (the passport stamp landing).
- *The camera is the editor.* In the globe, the camera flies; panels don't pop.

## 3. Gap analysis: the existing page

The concept page was already strong on ideas: the passport palette, MRZ strip,
stamped timeline, boarding-pass course card and a globe that lights up
countries in the order he filmed them. The gaps are execution and delivery:

| Trait | Before | Gap |
|---|---|---|
| Concept | Passport, stamps, boarding pass | ✅ Keep and push further |
| Typography | Anek Latin variable, width axis used | ✅ Keep; add kinetic reveals |
| Motion language | Count-up, stamp landing, timeline line | ❌ No system; no scroll storytelling; no smooth scroll |
| Signature moment | Globe | ✅ Keep; port to maintainable code |
| Real media | None; no thumbnails, no faces | ❌ Biggest visual gap |
| Micro-interactions | Basic hovers | ❌ None of the tactile layer |
| Mobile nav | Links hidden under 860px, no menu | ❌ Broken IA on phones |
| Performance | One 4.1 MB HTML file: fonts, textures, three.js all base64 inline | ❌ Parse-blocking; nothing cacheable |
| SEO/AEO/GEO | Good title, description, Person + Course JSON-LD, FAQ | ⚠️ One URL only; no OG image, sitemap, robots, VideoObject, breadcrumbs, `llms.txt`; 171 countries of data with no crawlable page each |

## 4. The plan that follows from the gaps

**Stack: Astro (static output) + GSAP + Lenis + three.js.**

- Astro ships zero JS by default and renders every page to plain HTML at build
  time. That is the easiest correct base for SEO, AEO and GEO: crawlers and LLM
  fetchers get full content without executing JS. Sitemap is one integration,
  and `llms.txt` and `robots.txt` are tiny endpoints generated from the same
  data. It deploys to any static host.
- GSAP is now fully free, including SplitText, ScrollTrigger and DrawSVG. It is
  the industry standard for scroll choreography.
- Lenis gives the inertial scroll, synced to GSAP's ticker.
- three.js is loaded only when the globe nears the viewport, so text paints
  first.

**Motion system** (tokens in `src/styles/motion.css` and
`src/scripts/motion/tokens.ts`):

- Eases: `expo.out` for reveals, `power3.inOut` for moves, stamp-impact
  overshoot only on stamps.
- Durations: 0.2s micro, 0.45s UI, 1.1s reveal; stagger 0.08s lines / 0.02s
  chars.
- Everything off under `prefers-reduced-motion`; content visible without JS.

**Signature motion pieces, all on-concept:**

1. Hero: MRZ lines type in; 0→177 counter widens on the font's width axis while
   the globe lights countries in order; headline lines rise from masks.
2. Proof band becomes a split-flap departures board.
3. Journey: a sticky route map. Scroll draws the flight path Delhi → … → Kabul
   leg by leg, a plane rides the tip, the year odometer rolls and the stamps
   slam down.
4. Boarding pass "prints" out of a slot and the barcode is scanned.
5. Crowd favourites: thumbnail follows the cursor; a velocity-reactive film
   strip of his most-watched frames.
6. Magnetic buttons, contextual cursor labels, mobile menu, giant footer
   wordmark, cross-document view transitions.

**Discoverability layer:**

- `/countries/` and 171 `/countries/<slug>/` pages, built from his real upload
  data. Each opens with a direct answer ("Yes. He first filmed Japan in October
  2019…"), then gives facts, the episode list and a build-time orthographic
  globe SVG centred on that country.
- JSON-LD graph: `WebSite`, `ProfilePage` → `Person`, `Course`, `FAQPage`,
  `VideoObject`, `ItemList`, `BreadcrumbList`, `Place`.
- `llms.txt` + `llms-full.txt`, `robots.txt` that names AI crawlers
  explicitly, sitemap, canonical, OG/Twitter image, 404.

### Caveats

- `llms.txt` is a community proposal; there is no published evidence it moves
  citations. It is cheap and harmless, so it ships.
- Google limits FAQ rich results to authoritative government and health sites.
  FAQPage markup is kept because answer engines still parse it, and it mirrors
  visible content exactly.
- This remains an unaffiliated concept site, and the footer says so. Indexing
  someone's name on a domain they don't control is not something to deploy
  without his approval.

### Sources

- Clutch, web designer pricing: https://clutch.co/web-designers/pricing
- DesignRush, 2026 budget guide: https://www.designrush.com/agency/website-design-development/trends/freelance-vs-web-design-agency-cost
- Digitaleer, web design cost: https://www.digitaleer.com/web-design-cost/
- Brandvm, custom website cost: https://www.brandvm.com/post/what-determines-custom-website-cost
- Awwwards GSAP / smooth-scroll collections: https://www.awwwards.com/sites/gsap , https://www.awwwards.com/inspiration/smooth-scroll
- Webflow, GSAP becomes free: https://webflow.com/blog/gsap-becomes-free
- Google, ProfilePage structured data: https://developers.google.com/search/docs/appearance/structured-data/profile-page
- Storyblok, GEO-ready site with Astro: https://storyblok.com/tp/geo-ready-website-storyblok-astro
- Barty-Bart/motion-graphics: https://github.com/Barty-Bart/motion-graphics
