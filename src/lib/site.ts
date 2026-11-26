// Facts shown across the site. One source of truth, each with the date it was checked,
// so page copy, JSON-LD and llms.txt can never disagree with each other.
import { visits, filmedCountries } from './data';

export const SITE = {
  name: 'Yatri Doctor',
  nameHi: 'यात्री डॉक्टर',
  person: 'Navankur Chaudhary',
  tagline: 'Hindi travel films from 177 of 197 countries, on an Indian passport',
  description:
    'Navankur Chaudhary, the Yatri Doctor, is an MBBS-trained doctor who films Hindi travel videos. By his count he has visited 177 of 197 countries. Spin a live globe of every country he has filmed.',
  locale: 'en_IN',
  lang: 'en-IN',
  email: 'doctoryatri@gmail.com',
  asOf: visits.asOf, // 2026-11-21
  asOfLabel: '21 Nov 2026',
  youtube: 'https://www.youtube.com/@yatridoctor',
  subscribe: 'https://www.youtube.com/@yatridoctor?sub_confirmation=1',
  instagram: 'https://www.instagram.com/navankurchaudhary/',
  facebook: 'https://www.facebook.com/navankur.chaudhary',
  graphy: 'https://yatridoctor.graphy.com/',
  course: {
    name: 'How to Get Flights for Free',
    url: 'https://yatridoctor.graphy.com/courses/HOW-TO-GET-FLIGHTS-FOR-FREE-64fc44b3e4b044f3fd2e5182',
    price: 599,
    listPrice: 999,
    currency: 'INR',
    lessons: 11,
    minutes: 34,
    bonus: 'Recorded Q&A, 1 hr 58 min',
    rating: '5.0 from 7 ratings',
    workload: 'PT2H32M',
  },
  now: {
    place: 'Afghanistan',
    video: 'CAy7Dyny7eE',
    title: 'A random Afghan became my friend and showed me Kabul',
    uploaded: '2026-11-20',
    loopStart: 2,
    loopEnd: 17,
  },
};

export const COUNTS = {
  hisCount: visits.hisCount, // 177
  total: visits.total, // 197
  toGo: visits.total - visits.hisCount,
  filmed: filmedCountries.length, // 171 in his videos
  subscribers: '1.96M',
  views: '443M',
  videos: visits.source.videos, // 995
  instagram: '602K',
  series: visits.source.playlists, // 52
  flights: '400+',
  years: 9,
};

// ----- formatting helpers -----
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDay = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const fmtMonth = (iso: string) => `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const fmtMonthLong = (iso: string) => `${MONTHS_LONG[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const fmtViews = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`;
export const fmtInt = (n: number) => n.toLocaleString('en-IN');

export const thumb = (id: string, size: 'mq' | 'hq' | 'sd' | 'maxres' = 'hq') => `https://i.ytimg.com/vi/${id}/${size}default.jpg`;
export const watch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const playlist = (id: string) => `https://www.youtube.com/playlist?list=${id}`;

/** Title-case YouTube shouting ("MY FIRST Day in ANTARCTICA") for calmer display. */
export function calmTitle(t: string) {
  return t
    .replace(/\s+/g, ' ')
    .replace(/\b([A-Z]{4,})\b/g, (w) => w[0] + w.slice(1).toLowerCase())
    .replace(/!{2,}/g, '!')
    .trim();
}
