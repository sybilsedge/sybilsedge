/**
 * Truncation utility for SEO meta descriptions.
 *
 * Collapses whitespace and trims the result to at most `maxLen` characters,
 * preferring a clean sentence boundary (`. `, `! `, `? `) over a hard cut.
 * If no sentence boundary exists within the limit the text is hard-truncated
 * and an ellipsis is appended.
 *
 * Usage:
 *   import { truncateToSentence } from '../../utils/truncate.ts';
 *   const description = truncateToSentence(entry.data.synopsis);
 */
export function truncateToSentence(text: string, maxLen = 155): string {
	// Normalise whitespace: replace newlines with spaces, collapse runs.
	const normalised = text.replace(/\s+/g, ' ').trim();

	if (normalised.length <= maxLen) return normalised;

	// Search backward from maxLen for the nearest sentence boundary.
	const window = normalised.slice(0, maxLen);
	const terminalBoundary = /[.!?]$/.test(window) ? window.length - 1 : -1;
	const lastSentence = Math.max(
		window.lastIndexOf('. '),
		window.lastIndexOf('! '),
		window.lastIndexOf('? '),
		terminalBoundary,
	);

	if (lastSentence !== -1) {
		// Include the punctuation character itself but not the trailing space.
		return normalised.slice(0, lastSentence + 1);
	}

	// No sentence boundary — hard truncate and append ellipsis.
	return normalised.slice(0, maxLen - 1) + '…';
}
