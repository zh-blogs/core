import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { buildMetadataIntegration } from './src/integrations/build-metadata';

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    port: 9902,
  },
  build: {
    serverEntry: 'index.mjs',
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@tabler/icons-svelte'],
    },
  },
  redirects: {
    '/list': {
      status: 301,
      destination: '/site',
    },
    '/new': {
      status: 301,
      destination: '/site/submit',
    },
    '/random': {
      status: 301,
      destination: '/site/go-site',
    },
    '/charts': {
      status: 301,
      destination: '/site/stats',
    },
    '/site/submit/create': {
      status: 301,
      destination: '/site/submit',
    },
  },
  integrations: [buildMetadataIntegration(), svelte(), mdx(), sitemap(), partytown()],
});
