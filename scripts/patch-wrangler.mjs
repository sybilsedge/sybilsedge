/**
 * postbuild patch for @astrojs/cloudflare v13 bug:
 * https://github.com/withastro/astro/issues/16107
 *
 * The adapter generates dist/server/wrangler.json with:
 *   - assets.binding: "ASSETS"  → reserved name, breaks Workers deploy
 *   - kv_namespaces with no id   → invalid, breaks wrangler validation
 *   - triggers: {}               → invalid schema, breaks wrangler validation
 *
 * This script strips those fields so wrangler deploy succeeds.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const configPath = resolve('dist/server/wrangler.json');

let raw;
try {
  raw = readFileSync(configPath, 'utf-8');
} catch {
  console.error('patch-wrangler: dist/server/wrangler.json not found — skipping');
  process.exit(0);
}

const config = JSON.parse(raw);

// Remove reserved ASSETS binding name (keep assets block, just drop binding key)
if (config.assets?.binding) {
  console.log(`patch-wrangler: removing assets.binding "${config.assets.binding}"`);
  delete config.assets.binding;
}

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

writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('patch-wrangler: dist/server/wrangler.json patched successfully');
