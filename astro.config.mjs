// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sybilsedge.com',
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      target: 'webworker',
      noExternal: true,
    },
  },
  integrations: [
    react(),
    sitemap(),
  ],
});
