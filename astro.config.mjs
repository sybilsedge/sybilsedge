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
    // Build-time image optimization — no Cloudflare Images binding needed
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
    // Prevent vite from externalizing node builtins needed by Content Collections
    ssr: {
      target: 'webworker',
      noExternal: true,
    },
  },
  integrations: [react(), sitemap()],
});
