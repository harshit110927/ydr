// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The canonical origin. Override at build time with SITE_URL if deploying elsewhere.
const site = process.env.SITE_URL || 'https://www.yatridoctor.in';

export default defineConfig({
  site,
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404/'),
      changefreq: 'weekly',
      lastmod: new Date('2026-11-21'),
    }),
  ],
  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
