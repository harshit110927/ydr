// Runtime data for the WebGL globe, generated at build time from the same dataset as the pages.
import type { APIRoute } from 'astro';
import topo from '../../data/topo.json';
import { meta, places, visits } from '../../lib/data';
import { calmTitle } from '../../lib/site';

const STATUS = { country: 1, territory: 2, home: 3, continent: 4 } as const;

export const GET: APIRoute = () => {
  const body = {
    hisCount: visits.hisCount,
    total: visits.total,
    meta,
    places: places.map((p) => ({
      c: p.code,
      s: p.slug,
      n: p.name,
      st: STATUS[p.status],
      f: p.first,
      t: p.trips.length,
      e: p.eps.length,
      top: [...p.eps].sort((a, b) => b.views - a.views).slice(0, 3).map((e) => [e.id, e.date, calmTitle(e.title), e.views]),
      q: p.trips.find((t) => t.quote)?.quote ? [p.trips.find((t) => t.quote)!.quote!.text, p.trips.find((t) => t.quote)!.quote!.id] : undefined,
      sr: p.trips.filter((t) => t.series).map((t) => [t.series!.id, t.series!.name]),
    })),
    topo,
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
