// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

/**
 * Vite plugin that ensures Durable Object classes are top-level exports of
 * _worker.js so Cloudflare can apply DO migrations (error 10070 otherwise).
 *
 * Two-step approach:
 * 1. `config` — adds agent/sybil-proxy.ts as an additional Rollup entry for
 *    the SSR build.  Rollup never tree-shakes entry-module exports, so the
 *    compiled class is guaranteed to appear in a named chunk.
 * 2. `generateBundle` — once Rollup has assembled the full bundle, finds the
 *    chunk that exports SybilProxyAgent and appends a re-export to _worker.js
 *    so the class is visible at the worker's top-level module scope.
 *
 * Why not rely on `export { SybilProxyAgent }` in [[...route]].ts?
 * Astro wraps API-route files and only imports the HTTP handler exports
 * (ALL/GET/POST/…).  The DO class re-export is unreachable from any other
 * module, so Rollup tree-shakes it away before the postbuild script runs.
 */
function durableObjectsPlugin() {
  return {
    name: 'cloudflare-durable-objects',
    apply: /** @type {'build'} */ ('build'),

    config(_config, env) {
      // isSsrBuild is Vite 5.1+ / Vite 7; fall back to checking build.ssr.
      const isSsr = /** @type {any} */ (env).isSsrBuild ?? _config.build?.ssr;
      if (!isSsr) return null;
      return {
        build: {
          rollupOptions: {
            input: {
              'durable-objects': fileURLToPath(
                new URL('./agent/sybil-proxy.ts', import.meta.url)
              ),
            },
          },
        },
      };
    },

    generateBundle(_options, bundle) {
      const worker = /** @type {any} */ (bundle['_worker.js']);
      if (!worker || worker.type !== 'chunk') return;

      for (const [fileName, chunk] of Object.entries(bundle)) {
        const c = /** @type {any} */ (chunk);
        if (c.type !== 'chunk' || fileName === '_worker.js') continue;
        if (c.exports?.includes('SybilProxyAgent')) {
          worker.code += `\nexport { SybilProxyAgent } from "./${fileName}";\n`;
          return;
        }
      }

      this.warn(
        'durableObjectsPlugin: SybilProxyAgent not found in any bundle chunk — ' +
        'Cloudflare DO migration will fail at deploy time'
      );
    },
  };
}

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
    plugins: [tailwindcss(), durableObjectsPlugin()],
    // Prevent vite from externalizing node builtins needed by Content Collections
    ssr: {
      target: 'webworker',
      noExternal: true,
      // cloudflare:* virtual modules are provided by the workerd runtime and
      // must NOT be bundled by Vite — doing so breaks DurableObject class
      // inheritance (partyserver/agents-sdk extend DurableObject from
      // cloudflare:workers, which becomes undefined when inlined).
      external: [/^cloudflare:/],
    },
  },
  integrations: [react(), mdx(), sitemap()],
  // Security headers are served for Cloudflare deployments from public/_headers.
  // Do not configure them here; keep the canonical CSP and related headers in
  // public/_headers (or a global src/middleware.ts if headers must be dynamic).
});
