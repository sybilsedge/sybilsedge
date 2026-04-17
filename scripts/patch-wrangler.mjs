/**
 * postbuild patch for @astrojs/cloudflare v13 bug:
 * https://github.com/withastro/astro/issues/16107
 *
 * The adapter generates dist/server/wrangler.json with:
 *   - kv_namespaces with no id   → invalid, breaks wrangler validation
 *   - triggers: {}               → invalid schema, breaks wrangler validation
 *
 * NOTE: assets.binding "ASSETS" is intentionally kept. The image-passthrough-endpoint
 * that @astrojs/cloudflare uses to serve optimised images calls env.ASSETS.fetch().
 * Without this binding, env.ASSETS is undefined at runtime and all images silently
 * fail to load. Wrangler ≥ 4.x accepts "ASSETS" as a binding name without error.
 *
 * This script also injects the SybilProxyAgent Durable Object binding and its
 * initial SQLite-backed migration. These are kept out of the source wrangler.jsonc
 * so that the Cloudflare Vite Plugin's Miniflare dev server does not attempt to
 * resolve and wrap the DO class at build-time (before the bundle exists).
 *
 * This script strips the invalid fields so wrangler deploy succeeds.
 */
import { readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const configPath = resolve('dist/server/wrangler.json');

let raw;
try {
  raw = readFileSync(configPath, 'utf-8');
} catch {
  console.error('patch-wrangler: dist/server/wrangler.json not found — skipping');
  process.exit(0);
}

const config = JSON.parse(raw);

// Remove SESSION KV stub (has no id, fails wrangler validation)
if (Array.isArray(config.kv_namespaces)) {
  const before = config.kv_namespaces.length;
  config.kv_namespaces = config.kv_namespaces.filter(kv => kv.id);
  if (config.kv_namespaces.length !== before) {
    console.log('patch-wrangler: removed SESSION KV binding stub (no id)');
  }
  if (config.kv_namespaces.length === 0) delete config.kv_namespaces;
}

// Remove invalid empty triggers object
if (config.triggers !== undefined && Object.keys(config.triggers).length === 0) {
  console.log('patch-wrangler: removing empty triggers field');
  delete config.triggers;
}

// Inject SybilProxyAgent Durable Object binding and v1 SQLite migration.
// Kept here rather than in wrangler.jsonc so that the Miniflare sync step
// doesn't try to resolve/wrap the DO class before the bundle exists.
if (!config.durable_objects) config.durable_objects = { bindings: [] };
const doBindings = config.durable_objects.bindings;
if (!doBindings.some(b => b.name === 'SybilProxyAgent')) {
  doBindings.push({ name: 'SybilProxyAgent', class_name: 'SybilProxyAgent' });
  console.log('patch-wrangler: added SybilProxyAgent Durable Object binding');
}

if (!config.migrations) config.migrations = [];
if (!config.migrations.some(m => m.tag === 'v1')) {
  config.migrations.push({ tag: 'v1', new_sqlite_classes: ['SybilProxyAgent'] });
  console.log('patch-wrangler: added v1 SQLite migration for SybilProxyAgent');
}

writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('patch-wrangler: dist/server/wrangler.json patched successfully');

// ─── Inject SybilProxyAgent top-level export into _worker.js ─────────────────
// Cloudflare requires every Durable Object class listed in a migration to be a
// named top-level export of the worker entry file.  Astro's Cloudflare adapter
// bundles API routes as dynamically-imported chunks, so the
// `export { SybilProxyAgent }` in [[...route]].ts is only a chunk-level export
// and never reaches _worker.js.  We fix that here by finding the compiled chunk
// that contains the class and appending a re-export to _worker.js.

const serverDir = resolve('dist/server');
const workerPath = resolve(serverDir, '_worker.js');

// Recursively collect all .js files under dist/server
function collectJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

let agentChunkPath = null;
for (const filePath of collectJsFiles(serverDir)) {
  if (filePath === workerPath) continue;
  const content = readFileSync(filePath, 'utf-8');
  if (/class SybilProxyAgent\b/.test(content) || /SybilProxyAgent\s+extends\b/.test(content)) {
    agentChunkPath = filePath;
    break;
  }
}

if (agentChunkPath) {
  const relPath = './' + relative(serverDir, agentChunkPath).replace(/\\/g, '/');
  // Only append if _worker.js doesn't already re-export it (idempotent)
  const workerContent = readFileSync(workerPath, 'utf-8');
  if (!workerContent.includes('SybilProxyAgent')) {
    appendFileSync(workerPath, `\nexport { SybilProxyAgent } from "${relPath}";\n`);
    console.log(`patch-wrangler: appended SybilProxyAgent top-level export to _worker.js (from ${relPath})`);
  } else {
    console.log('patch-wrangler: _worker.js already exports SybilProxyAgent — skipping');
  }
} else {
  console.warn('patch-wrangler: WARNING — could not find compiled chunk for SybilProxyAgent; DO migration may fail');
}
