// @ts-check
import { defineConfig } from 'astro/config';
import { passthroughImageService } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: false,
    },
  }),
  // Use passthrough image service — avoids requiring Cloudflare Images binding
  image: {
    service: passthroughImageService(),
  },
  build: {
    // Avoid collision with Cloudflare Pages reserved 'ASSETS' binding
    assets: '_astro',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
