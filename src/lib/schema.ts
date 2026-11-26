// JSON-LD builders. Every node uses stable @ids so search and answer engines can
// join the home page, the country pages and the course into one entity graph.
import { SITE, COUNTS, thumb, watch, calmTitle } from './site';
import { faqs } from './faq';
import type { Place } from './data';

export const abs = (site: URL | undefined, path = '/') => new URL(path, site ?? 'https://www.yatridoctor.in').href;

export function ids(site: URL | undefined) {
  const root = abs(site);
  return {
    root,
    website: `${root}#website`,
    person: `${root}#person`,
    profile: `${root}#profile`,
    course: `${root}#course`,
    faq: `${root}#faq`,
  };
}

export function personNode(site: URL | undefined) {
  const id = ids(site);
  return {
    '@type': 'Person',
    '@id': id.person,
    name: SITE.person,
    alternateName: [SITE.name, SITE.nameHi],
    url: id.root,
    image: abs(site, '/og.jpg'),
    jobTitle: 'Travel filmmaker',
    description: `MBBS-trained doctor who films Hindi travel videos on the YouTube channel Yatri Doctor; ${COUNTS.hisCount} of ${COUNTS.total} countries by his count (November 2026).`,
    knowsLanguage: ['hi', 'en'],
    nationality: { '@type': 'Country', name: 'India' },
    hasOccupation: [
      { '@type': 'Occupation', name: 'Travel vlogger' },
      { '@type': 'Occupation', name: 'Physician (MBBS)' },
    ],
    knowsAbout: ['Travel on an Indian passport', 'Visa applications for Indian citizens', 'Budget flights', 'Remote destinations', 'Antarctica', 'North Korea', 'Pacific islands'],
    email: `mailto:${SITE.email}`,
    sameAs: [SITE.youtube, SITE.instagram, SITE.facebook, SITE.graphy],
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/FollowAction', userInteractionCount: 1960000, name: 'YouTube subscribers' },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WriteAction', userInteractionCount: COUNTS.videos, name: 'YouTube videos' },
    ],
  };
}

export function websiteNode(site: URL | undefined) {
  const id = ids(site);
  return {
    '@type': 'WebSite',
    '@id': id.website,
    url: id.root,
    name: SITE.name,
    alternateName: SITE.nameHi,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { '@id': id.person },
    about: { '@id': id.person },
  };
}

export function courseNode(site: URL | undefined) {
  const id = ids(site);
  const c = SITE.course;
  return {
    '@type': 'Course',
    '@id': id.course,
    name: c.name,
    description:
      'How he finds free, cheap and discounted fares, earns rewards booking flights and hotels for other people, and keeps a whole trip on budget, from more than 400 international flights.',
    provider: { '@id': id.person },
    instructor: { '@id': id.person },
    url: c.url,
    inLanguage: 'hi',
    offers: { '@type': 'Offer', price: String(c.price), priceCurrency: c.currency, category: 'Paid', url: c.url, availability: 'https://schema.org/InStock' },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: c.workload, instructor: { '@id': id.person } },
  };
}

export function faqNode(site: URL | undefined) {
  return {
    '@type': 'FAQPage',
    '@id': ids(site).faq,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function videoNode(v: { id: string; title: string; date: string; views?: number; description?: string }, site: URL | undefined, lite = false) {
  // Inside long lists, keep only what's needed to identify the video; the watch page has the rest.
  if (lite) return { '@type': 'VideoObject', name: calmTitle(v.title), thumbnailUrl: thumb(v.id, 'hq'), uploadDate: v.date, contentUrl: watch(v.id) };
  return {
    '@type': 'VideoObject',
    '@id': `${watch(v.id)}#video`,
    name: calmTitle(v.title),
    description: v.description ?? `${calmTitle(v.title)}. A Hindi travel film by ${SITE.person} (Yatri Doctor).`,
    thumbnailUrl: [thumb(v.id, 'maxres'), thumb(v.id, 'hq')],
    uploadDate: v.date,
    contentUrl: watch(v.id),
    embedUrl: `https://www.youtube.com/embed/${v.id}`,
    inLanguage: 'hi',
    creator: { '@id': ids(site).person },
    ...(v.views ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: v.views } } : {}),
  };
}

export function breadcrumbs(site: URL | undefined, trail: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(site, path) })),
  };
}

export function placeNode(p: Place) {
  const type = p.status === 'continent' ? 'Continent' : p.status === 'territory' ? 'AdministrativeArea' : 'Country';
  return {
    '@type': type,
    name: p.name,
    ...(p.status === 'country' || p.status === 'home' ? { identifier: p.code } : {}),
    geo: { '@type': 'GeoCoordinates', latitude: +p.lat.toFixed(3), longitude: +p.lon.toFixed(3) },
  };
}

export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });
