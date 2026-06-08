import { defineMiddleware } from 'astro:middleware';

/**
 * Compatibility shim for packages that still access Astro.locals.runtime.env,
 * which was removed in Astro v6 (see https://docs.astro.build/en/guides/upgrade-to/v6/).
 *
 * @keystatic/astro reads context.locals.runtime.env to discover the Cloudflare
 * secrets (KEYSTATIC_GITHUB_CLIENT_ID, etc.) at request time. In Astro v6 the
 * adapter no longer populates that namespace; instead secrets are available via
 * `import { env } from "cloudflare:workers"`.
 *
 * This middleware lazily injects a `runtime.env` object so that Keystatic's
 * handler can resolve its secrets without modification. On local dev (Node.js
 * adapter) the dynamic import of "cloudflare:workers" will throw and the shim
 * is silently skipped, which is correct — local Keystatic uses `kind: "local"`
 * storage and never reaches the GitHub OAuth path.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	// Only inject the shim when we're running inside Cloudflare Workers and the
	// runtime object isn't already present (guards against double-injection).
	if (typeof (context.locals as any).runtime === 'undefined') {
		try {
			const { env } = await import('cloudflare:workers');
			(context.locals as any).runtime = { env };
		} catch {
			// Not in Cloudflare runtime — local dev, no-op.
		}
	}

	return next();
});
