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
 * This script strips the invalid fields so wrangler deploy succeeds.
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

// ── Inject Workers AI binding ─────────────────────────────────────────────
if (!config.ai) {
  config.ai = { binding: 'AI' };
  console.log('patch-wrangler: added Workers AI binding');
}

// ── Inject Durable Object binding for SybilTwinDO ────────────────────────
const DO_BINDING = { name: 'SYBIL_TWIN', class_name: 'SybilTwinDO' };
const DO_MIGRATION = { tag: 'v1', new_sqlite_classes: ['SybilTwinDO'] };

if (!config.durable_objects) {
  config.durable_objects = { bindings: [DO_BINDING] };
  console.log('patch-wrangler: added SYBIL_TWIN DO binding');
} else if (!Array.isArray(config.durable_objects.bindings)) {
  config.durable_objects.bindings = [DO_BINDING];
  console.log('patch-wrangler: added SYBIL_TWIN DO binding (created bindings array)');
} else if (!config.durable_objects.bindings.some(b => b.name === 'SYBIL_TWIN')) {
  config.durable_objects.bindings.push(DO_BINDING);
  console.log('patch-wrangler: added SYBIL_TWIN to existing DO bindings');
}

// ── Inject DO migration for SybilTwinDO ──────────────────────────────────
if (!Array.isArray(config.migrations)) {
  config.migrations = [DO_MIGRATION];
  console.log('patch-wrangler: added SybilTwinDO migration v1');
} else if (!config.migrations.some(m => Array.isArray(m.new_sqlite_classes) && m.new_sqlite_classes.includes('SybilTwinDO'))) {
  config.migrations.push(DO_MIGRATION);
  console.log('patch-wrangler: appended SybilTwinDO to migrations');
}

// ── Inject R2 binding for private knowledge-base bucket ──────────────────
const R2_BINDING = { binding: 'SYBIL_TWIN_KB', bucket_name: 'sybil-twin-kb' };

if (!Array.isArray(config.r2_buckets)) {
  config.r2_buckets = [R2_BINDING];
  console.log('patch-wrangler: added SYBIL_TWIN_KB R2 binding');
} else if (!config.r2_buckets.some(b => b.binding === 'SYBIL_TWIN_KB')) {
  config.r2_buckets.push(R2_BINDING);
  console.log('patch-wrangler: added SYBIL_TWIN_KB to existing R2 bindings');
}

writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('patch-wrangler: dist/server/wrangler.json patched successfully');
