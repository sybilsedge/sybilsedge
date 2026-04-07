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
    // Disable auto-provisioned SESSION KV binding — we have no KV namespace yet
    experimentalSessions: false,
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
