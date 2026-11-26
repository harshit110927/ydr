// Typed access to the visit dataset. Everything the site says about countries,
// episodes and counts is derived here, at build time, from src/data/yd.json.
import raw from '../data/yd.json';

type RawEp = [id: string, date: string, title: string, views: number, inCountry: number];
type RawTrip = { from: string; to: string; eps: RawEp[]; series?: [string, string]; quote?: [string, string] };
type RawMeta = [i: number, code: string, name: string, region: string, sub: string, lon: number, lat: number, km2: number, sovereign: number];

const data = raw as unknown as {
  meta: RawMeta[];
  series: { r: string; u: string; n: string; c: number }[];
  visits: {
    asOf: string;
    hisCount: number;
    total: number;
    home: string;
    channel: string;
    source: { videos: number; playlists: number };
    hisCounts: [string, number, string][];
    milestones: [string, string, string?][];
    countries: Record<string, RawTrip[]>;
    territories: Record<string, RawTrip[]>;
    antarctica: RawTrip;
  };
};

export const visits = data.visits;
export const meta = data.meta;
export const seriesList = data.series;

export type Episode = { id: string; date: string; title: string; views: number };
export type Trip = {
  from: string;
  to: string;
  eps: Episode[];
  series?: { id: string; name: string };
  quote?: { text: string; id: string };
};
export type Status = 'home' | 'country' | 'territory' | 'continent';
export type Place = {
  code: string;
  slug: string;
  name: string;
  region: string;
  sub: string;
  lon: number;
  lat: number;
  km2: number;
  status: Status;
  trips: Trip[];
  first: string;
  last: string;
  eps: Episode[]; // deduped, oldest first
  views: number;
  top?: Episode;
  /** 1-based position in the order he first filmed each place */
  order: number;
};

const EXTRA: Record<string, Partial<Place>> = {
  UNK: { name: 'Kosovo', region: 'Europe', sub: 'Southern Europe', lon: 20.9, lat: 42.6, km2: 10887 },
  ATA: { name: 'Antarctica', region: 'Antarctica', sub: 'Antarctica', lon: -62.2, lat: -64.6 },
};

// Largest polygon per ISO code holds the canonical name and label point.
const byCode = new Map<string, RawMeta>();
for (const m of meta) {
  const cur = byCode.get(m[1]);
  if (!cur || m[7] > cur[7]) byCode.set(m[1], m);
}

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const toTrip = (t: RawTrip): Trip => ({
  from: t.from,
  to: t.to,
  eps: t.eps.map(([id, date, title, views]) => ({ id, date, title, views })),
  series: t.series ? { id: t.series[0], name: t.series[1] } : undefined,
  quote: t.quote ? { text: t.quote[0], id: t.quote[1] } : undefined,
});

function build(code: string, rawTrips: RawTrip[], status: Status): Omit<Place, 'order'> {
  const m = byCode.get(code);
  const extra = EXTRA[code] || {};
  const name = (extra.name ?? m?.[2] ?? code) as string;
  const trips = rawTrips.map(toTrip).sort((a, b) => a.from.localeCompare(b.from));
  const seen = new Set<string>();
  const eps: Episode[] = [];
  for (const t of trips) for (const e of t.eps) if (!seen.has(e.id)) (seen.add(e.id), eps.push(e));
  eps.sort((a, b) => a.date.localeCompare(b.date));
  const top = eps.reduce<Episode | undefined>((best, e) => (!best || e.views > best.views ? e : best), undefined);
  return {
    code,
    slug: slugify(name),
    name,
    region: (extra.region ?? m?.[3] ?? 'Europe') as string,
    sub: (extra.sub ?? m?.[4] ?? '') as string,
    lon: (extra.lon ?? m?.[5] ?? 0) as number,
    lat: (extra.lat ?? m?.[6] ?? 0) as number,
    km2: (extra.km2 ?? m?.[7] ?? 0) as number,
    status,
    trips,
    first: trips[0]?.from ?? '',
    last: trips[trips.length - 1]?.to ?? '',
    eps,
    views: eps.reduce((s, e) => s + (e.views || 0), 0),
    top: top && top.views > 0 ? top : undefined,
  };
}

const unordered = [
  ...Object.entries(visits.countries).map(([c, t]) => build(c, t, c === visits.home ? 'home' : 'country')),
  ...Object.entries(visits.territories || {}).map(([c, t]) => build(c, t, 'territory')),
  build('ATA', [visits.antarctica], 'continent'),
];

/** Every place he has filmed, oldest first-visit first. */
export const places: Place[] = unordered
  .sort((a, b) => a.first.localeCompare(b.first) || a.name.localeCompare(b.name))
  .map((p, i) => ({ ...p, order: i + 1 }));

export const placeBySlug = new Map(places.map((p) => [p.slug, p]));
export const placeByCode = new Map(places.map((p) => [p.code, p]));

export const filmedCountries = places.filter((p) => p.status === 'country' || p.status === 'home');
export const REGIONS = ['Asia', 'Europe', 'Africa', 'Americas', 'Oceania', 'Antarctica'] as const;

export const placesByRegion = REGIONS.map((r) => ({
  region: r,
  places: places.filter((p) => p.region === r).sort((a, b) => a.name.localeCompare(b.name)),
})).filter((g) => g.places.length);

/** All unique episodes across places, most viewed first. */
export const allEpisodes: (Episode & { place: Place })[] = (() => {
  const seen = new Map<string, Episode & { place: Place }>();
  for (const p of places) for (const e of p.eps) if (!seen.has(e.id)) seen.set(e.id, { ...e, place: p });
  return [...seen.values()].sort((a, b) => b.views - a.views);
})();

export const totalFilmedEpisodes = allEpisodes.length;
