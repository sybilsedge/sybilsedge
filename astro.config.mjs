// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Use build-time image compilation — avoids requiring Cloudflare Images binding
    imageService: 'compile',
    // Use Node.js for prerendering — required for Content Collections (node:fs)
    prerenderEnvironment: 'node',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
