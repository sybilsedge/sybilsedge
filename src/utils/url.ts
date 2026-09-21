/**
 * URL normalization utilities for canonical URLs and trailing slashes.
 */

/**
 * Returns a fully-qualified canonical URL with a consistent trailing slash
 * for directory routes, preserving paths that end with file extensions.
 */
export function getCanonicalUrl(pathname: string, site?: URL | string): string {
	const siteBase = site ?? 'https://sybilsedge.com';
	const normalizedPath = pathname.endsWith('/') || /\.[a-z0-9]+$/i.test(pathname)
		? pathname
		: `${pathname}/`;
	return new URL(normalizedPath, siteBase).toString();
}
