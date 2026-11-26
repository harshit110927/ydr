// Build-time orthographic globe, centred on one place, rendered to compact SVG paths.
// Runs in Node during `astro build`; the browser receives plain SVG, no JS.
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import { presimplify, simplify } from 'topojson-simplify';
import type { Topology, GeometryCollection } from 'topojson-specification';
import topoRaw from '../data/topo.json';
import { meta, places } from './data';

// A 400px globe can't show detail finer than ~0.3°, so simplify once (Visvalingam, in steradians).
// (cast: topojson-simplify and topojson-specification disagree on the properties generic)
const topo = simplify(presimplify(structuredClone(topoRaw) as any), 3.5e-5) as unknown as Topology;
const obj = topo.objects[Object.keys(topo.objects)[0]] as GeometryCollection;
const codeOfIdx = new Map(meta.map((m) => [m[0], m[1]]));
const visited = new Set(places.map((p) => p.code));
const isVisited = (g: { id?: string | number }) => visited.has(codeOfIdx.get(+(g.id ?? 0)) ?? '');

// Disjoint layers: unvisited land and visited land never overlap, so nothing is drawn twice.
const landOther = merge(topo, obj.geometries.filter((g) => !isVisited(g)) as any);
const landVisited = merge(topo, obj.geometries.filter(isVisited) as any);
const allFeatures = feature(topo, obj) as unknown as GeoJSON.FeatureCollection;
const graticule = geoGraticule().step([30, 30])();

/**
 * Compact SVG path context: relative commands at 0.1px, points closer than `minDist`
 * dropped, and closed rings smaller than `minRing` px (specks of islands) skipped.
 */
function compactContext(minDist = 1.5, minRing = 1.6) {
  let d = '';
  let ring: [number, number][] = [];
  const q = (n: number) => Math.round(n * 10) / 10;
  const flush = (closed: boolean) => {
    if (!ring.length) return;
    if (closed) {
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      if (Math.max(...xs) - Math.min(...xs) < minRing && Math.max(...ys) - Math.min(...ys) < minRing) { ring = []; return; }
    }
    // Deltas are taken between already-rounded points, so rounding error never accumulates.
    let px = q(ring[0][0]), py = q(ring[0][1]);
    const pairs: string[] = [];
    for (let i = 1; i < ring.length; i++) {
      const nx = q(ring[i][0]), ny = q(ring[i][1]);
      const dx = q(nx - px), dy = q(ny - py);
      if (!dx && !dy) continue;
      pairs.push(`${dx},${dy}`);
      px = nx; py = ny;
    }
    d += `M${q(ring[0][0])},${q(ring[0][1])}` + (pairs.length ? `l${pairs.join(' ')}` : '') + (closed ? 'z' : '');
    ring = [];
  };
  return {
    moveTo(x: number, y: number) { flush(false); ring = [[x, y]]; },
    lineTo(x: number, y: number) {
      const [lx, ly] = ring[ring.length - 1];
      if (Math.hypot(x - lx, y - ly) < minDist) return;
      ring.push([x, y]);
    },
    closePath() { flush(true); },
    arc() { /* points are drawn by the component, not by geoPath */ },
    result() { flush(false); const out = d; d = ''; return out; },
  };
}

export function orthoFor(code: string, lon: number, lat: number, size = 400) {
  const pad = 6;
  const radius = size / 2 - pad;
  // Keep a little of the horizon in view for polar places
  const tilt = Math.max(-55, Math.min(55, lat));
  const proj = geoOrthographic().rotate([-lon, -tilt]).translate([size / 2, size / 2]).scale(radius).clipAngle(90).precision(1.5);
  const ctx = compactContext();
  const path = geoPath(proj, ctx as any);
  const draw = (o: any) => { path(o); return ctx.result(); };

  const focusFeatures = allFeatures.features.filter((f) => codeOfIdx.get(+(f.id ?? 0)) === code);
  // Focus country keeps finer detail: it's the subject
  const fine = compactContext(0.6, 0);
  const focusPath = geoPath(proj, fine as any);
  focusPath({ type: 'FeatureCollection', features: focusFeatures } as any);
  const pin = proj([lon, lat]);

  return {
    size,
    cx: size / 2,
    radius,
    graticule: draw(graticule),
    other: draw(landOther),
    visited: draw(landVisited),
    focus: fine.result(),
    pin: pin ? { x: Math.round(pin[0] * 10) / 10, y: Math.round(pin[1] * 10) / 10 } : null,
  };
}
