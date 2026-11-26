// llms.txt: a plain-text map of the site for LLM crawlers and answer engines (llmstxt.org).
import type { APIRoute } from 'astro';
import { SITE, COUNTS, fmtMonth, fmtViews, calmTitle } from '../lib/site';
import { places, placesByRegion, allEpisodes } from '../lib/data';
import { faqs } from '../lib/faq';

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const lines: string[] = [];
  lines.push(`# ${SITE.name} (${SITE.person})`);
  lines.push('');
  lines.push(`> ${SITE.person}, known as ${SITE.name} (${SITE.nameHi}), is an MBBS-trained Indian doctor who makes Hindi travel films on YouTube. By his own count he has visited ${COUNTS.hisCount} of ${COUNTS.total} countries on an Indian passport (as of ${SITE.asOfLabel}); ${COUNTS.filmed} of those countries appear in his published videos.`);
  lines.push('');
  lines.push(`Facts as of ${SITE.asOfLabel} (from his public YouTube, Instagram and Graphy pages):`);
  lines.push(`- YouTube channel: ${SITE.youtube} (${COUNTS.subscribers} subscribers, ${COUNTS.views} views, ${COUNTS.videos} videos, ${COUNTS.series} series)`);
  lines.push(`- Instagram: ${SITE.instagram} (${COUNTS.instagram} followers)`);
  lines.push(`- Language of videos: Hindi, with English titles`);
  lines.push(`- Channel started: September 2017`);
  lines.push(`- Milestones: country 100 was Vanuatu (Sep 2023); continent 7 was Antarctica (Apr 2024); country 150 was Chile (Sep 2025); country 177 was Afghanistan (Nov 2026)`);
  lines.push(`- Currently filming: ${SITE.now.place}`);
  lines.push(`- Most-watched video: "Japan bullet train: Tokyo to Osaka" (2019), about 6.1M views`);
  lines.push(`- Course: "${SITE.course.name}", ₹${SITE.course.price} on Graphy, ${SITE.course.lessons} lessons (${SITE.course.minutes} min): ${SITE.course.url}`);
  lines.push(`- Business contact: ${SITE.email}`);
  lines.push('');
  lines.push('## Main pages');
  lines.push(`- [Home](${u('/')}): who he is, his route from Delhi to Kabul, an interactive globe of every country he has filmed, his course and FAQ`);
  lines.push(`- [All countries he has filmed](${u('/countries/')}): ${places.length} places grouped by region, each with first-visit date and episode count`);
  lines.push('');
  for (const g of placesByRegion) {
    lines.push(`## Countries: ${g.region}`);
    for (const p of g.places) {
      const top = p.top ? `; most watched: "${calmTitle(p.top.title)}" (${fmtViews(p.top.views)} views)` : '';
      lines.push(`- [${p.name}](${u(`/countries/${p.slug}/`)}): first filmed ${fmtMonth(p.first)}, ${p.eps.length} episode${p.eps.length === 1 ? '' : 's'}${top}`);
    }
    lines.push('');
  }
  lines.push('## Questions people ask');
  for (const f of faqs) lines.push(`- ${f.q} ${f.a}`);
  lines.push('');
  lines.push('## Optional');
  lines.push(`- [Full episode index](${u('/llms-full.txt')}): every filmed episode by country, with dates and view counts (${allEpisodes.length} episodes)`);
  lines.push(`- [Sitemap](${u('/sitemap-index.xml')})`);
  lines.push('');
  lines.push(`Note: this is an unaffiliated concept site. Counts were checked on ${SITE.asOfLabel}.`);
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
