/**
 * Reading time utility.
 *
 * Estimates reading time from raw MDX/Markdown body content.
 * Strips JSX/MDX component tags before counting words so that
 * component prop noise doesn't inflate the estimate.
 *
 * Formula: ceil(wordCount / 200) minutes, minimum 1 min.
 *
 * Usage:
 *   import { getReadingTime } from '../../utils/readingTime.ts';
 *   const readingTime = getReadingTime(entry.body ?? '');
 */
export function getReadingTime(body: string): string {
	const stripped = body
		// Strip paired JSX/MDX component tags and their content:
		// <Component prop="x">...</Component>
		.replace(/<[A-Z][A-Za-z0-9.]*[^>]*>[\s\S]*?<\/[A-Z][A-Za-z0-9.]*>/g, ' ')
		// Strip self-closing JSX/MDX component tags: <Component prop="x" />
		.replace(/<[A-Z][A-Za-z0-9.]*[^>]*\/>/g, ' ')
		// Strip any remaining HTML/JSX tags
		.replace(/<[^>]+>/g, ' ');

	const wordCount = stripped.trim().split(/\s+/).filter(Boolean).length;
	const minutes = Math.max(1, Math.ceil(wordCount / 200));
	return `${minutes} min read`;
}
