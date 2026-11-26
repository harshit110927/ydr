// Visible FAQ copy. The FAQPage JSON-LD is generated from this same array,
// so the markup can never drift from what readers see.
import { SITE, COUNTS } from './site';

export const faqs = [
  {
    q: 'Is Yatri Doctor a real doctor?',
    a: 'Yes. Navankur Chaudhary trained as an MBBS doctor before moving into travel filmmaking. Yatri means traveller in Hindi, so the name means the travelling doctor.',
  },
  {
    q: 'How many countries has he visited?',
    a: `${COUNTS.hisCount} of the ${COUNTS.total} countries he is counting toward, according to his Instagram bio in November 2026. ${COUNTS.filmed} of them appear in his YouTube videos so far. His 100th country was Vanuatu in 2023 and his 150th was Chile in 2025.`,
  },
  {
    q: 'Where is he travelling now?',
    a: `${SITE.now.place}. The series began in November 2026 with a flight from India to Kabul.`,
  },
  {
    q: 'What is his most-watched video?',
    a: '"Japan bullet train: Tokyo to Osaka" from 2019, with 6.1 million views. "Indian in Lahore, Pakistan" from 2024 is next, with 5.1 million.',
  },
  {
    q: 'What does the flights course cost?',
    a: `₹${SITE.course.price} on Graphy (listed at ₹${SITE.course.listPrice}) on ${SITE.asOfLabel}. It has ${SITE.course.lessons} video lessons, about ${SITE.course.minutes} minutes in all, plus a recorded Q&A of almost two hours.`,
  },
  {
    q: 'Does he make visa guides for Indian passport holders?',
    a: 'His Visa process playlist covers Singapore, Malaysia, Hong Kong, Dubai, Russia, Kazakhstan, Japan, the Maldives and Sri Lanka. The videos are several years old, so check current rules on the official embassy or e-visa site before you apply.',
  },
  {
    q: 'What language are his videos in?',
    a: 'Hindi, with English titles.',
  },
];
