// llms-full.txt: the complete episode index, one section per country, for answer engines
// that want to cite specifics ("When did Yatri Doctor go to Fiji?").
import type { APIRoute } from 'astro';
import { SITE, COUNTS, fmtDay, fmtViews, calmTitle, watch, playlist } from '../lib/site';
import { places } from '../lib/data';

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const out: string[] = [
    `# ${SITE.name} (${SITE.person}): full episode index`,
    '',
    `> Every country, territory and continent in his published YouTube videos, in the order he first filmed them. ${COUNTS.filmed} countries are filmed; his own count is ${COUNTS.hisCount} of ${COUNTS.total}. Data as of ${SITE.asOfLabel}. View counts are YouTube's public counts on that date (0 means not recorded).`,
    '',
  ];
  for (const p of places) {
    out.push(`## ${p.order}. ${p.name} (${p.code})`);
    out.push(`Page: ${u(`/countries/${p.slug}/`)}`);
    out.push(`Region: ${p.region}${p.sub ? `, ${p.sub}` : ''}. First filmed ${fmtDay(p.first)}. ${p.trips.length} trip${p.trips.length === 1 ? '' : 's'}, ${p.eps.length} episode${p.eps.length === 1 ? '' : 's'}.`);
    for (const t of p.trips) {
      const series = t.series ? ` Series: ${t.series.name} (${playlist(t.series.id)}).` : '';
      out.push(`Trip ${fmtDay(t.from)} to ${fmtDay(t.to)}.${series}`);
      if (t.quote) out.push(`In his words: "${t.quote.text}"`);
    }
    for (const e of p.eps) out.push(`- ${fmtDay(e.date)}: ${calmTitle(e.title)}${e.views ? ` (${fmtViews(e.views)} views)` : ''} ${watch(e.id)}`);
    out.push('');
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
