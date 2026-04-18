// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

/**
 * Vite plugin that compiles SybilTwinDO and injects it as a top-level export
 * into _worker.js, which Cloudflare requires for DO class registration.
 *
 * Strategy:
 *   generateBundle() — uses esbuild (bundled with Vite) to compile
 *   src/agent/sybil-twin.ts into a self-contained IIFE, then appends it to
 *   _worker.js with a top-level export.  The IIFE wrapper avoids variable
 *   collisions with the main bundle.  Only runs when _worker.js is present
 *   (i.e., the SSR build — not the client asset build).
 *
 * NOTE: We do NOT add sybil-twin.ts as an additional Rollup entry because
 * @astrojs/cloudflare targets webworker SSR, which sets
 * output.inlineDynamicImports: true — Rollup rejects multiple inputs with
 * that option.  The esbuild approach is independent of Rollup's pipeline.
 */
function durableObjectsPlugin() {
	const entry = fileURLToPath(
		new URL('./src/agent/sybil-twin.ts', import.meta.url)
	);
	/** Unique global name for the IIFE — minimises collision risk. */
	const IIFE_GLOBAL = '__sybil_do_export__';

	return {
		name: 'durable-objects-export',
		/** @param {any} _opts @param {import('rollup').OutputBundle} bundle */
		generateBundle(_opts, bundle) {
			// The SSR entry may be _worker.js (older adapters) or entry.mjs
			// Only applicable to the SSR build — absent in client asset builds
			const workerChunk =
				bundle['_worker.js'] ??
				bundle['entry.mjs'] ??
				Object.values(bundle).find(
					(c) => c.type === 'chunk' && c.isEntry && c.fileName.endsWith('.mjs')
				);
			if (!workerChunk || workerChunk.type !== 'chunk') return;

			// Compile the DO class with esbuild (synchronous, no I/O wait)
			let iifeCode;
			try {
				const _require = createRequire(import.meta.url);
				const { buildSync } = _require('esbuild');
				const result = buildSync({
					entryPoints: [entry],
					bundle: true,
					format: 'iife',
					globalName: IIFE_GLOBAL,
					write: false,
					minify: false,
					target: 'es2022',
					logLevel: 'silent',
				});
				iifeCode = result.outputFiles[0].text;
			} catch (err) {
				this.warn(`[durable-objects] esbuild compile failed: ${err}`);
				return;
			}

			// Append IIFE + top-level re-export to _worker.js
			workerChunk.code +=
				`\n// ── SybilTwinDO — Durable Object class (injected by durableObjectsPlugin) ──\n` +
				iifeCode +
				`\nconst { SybilTwinDO } = ${IIFE_GLOBAL};\n` +
				`export { SybilTwinDO };\n`;
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
    },
  },
  integrations: [react(), mdx(), sitemap()],
  // Security headers are served for Cloudflare deployments from public/_headers.
  // Do not configure them here; keep the canonical CSP and related headers in
  // public/_headers (or a global src/middleware.ts if headers must be dynamic).
});
