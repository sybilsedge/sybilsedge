// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sybilsedge.com',
  output: 'server',
  adapter: cloudflare({
    // Build-time image optimization — no Cloudflare Images binding needed
    imageService: 'compile',
    // Explicitly disable Astro sessions — prevents the adapter from injecting
    // a SESSION KV binding stub into dist/server/wrangler.json, which would
    // cause a UserError at runtime (KV bindings require an "id" field).
    // Re-enable and provision a real KV namespace if sessions are needed later.
    sessions: false,
  }),
  vite: {
    plugins: [tailwindcss()],
    // Prevent vite from externalizing node builtins needed by Content Collections
    ssr: {
      target: 'webworker',
      noExternal: true,
    },
  },
  integrations: [react(), mdx(), sitemap()],
  // Security headers are served for Cloudflare deployments from public/_headers.
  // Do not configure them here; keep the canonical CSP and related headers in
  // public/_headers (or a global src/middleware.ts if headers must be dynamic).
});
