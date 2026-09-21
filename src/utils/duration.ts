/**
 * Duration parsing and ISO 8601 duration formatting utilities for recipe schema.
 */

/**
 * Parses human-readable duration strings (e.g. "10 min", "1 hr 45 min", "10–15 min", "2 hours")
 * into total minutes.
 */
export function parseToMinutes(durationStr?: string): number | undefined {
	if (!durationStr || typeof durationStr !== 'string') return undefined;

	const trimmed = durationStr.trim().toLowerCase();
	if (!trimmed) return undefined;

	let totalMinutes = 0;
	let matched = false;

	// Normalize dashes (en-dash, em-dash to hyphen)
	const normalized = trimmed.replace(/[–—]/g, '-');

	// Match hours: e.g. "1 hr", "2 hours", "1.5 hrs", "2-4 hr"
	const hourRegex = /(?:(\d+(?:\.\d+)?)\s*-\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr|h)\b/gi;
	let match: RegExpExecArray | null;

	while ((match = hourRegex.exec(normalized)) !== null) {
		matched = true;
		// Use upper bound if range (e.g. "2-4 hr" -> 4)
		const val = parseFloat(match[2] ?? match[1]);
		if (!isNaN(val)) {
			totalMinutes += Math.round(val * 60);
		}
	}

	// Match minutes: e.g. "10 min", "25 mins", "10-15 min", "45 minutes"
	const minRegex = /(?:(\d+)\s*-\s*)?(\d+)\s*(?:minutes?|mins?|min|m)\b/gi;
	while ((match = minRegex.exec(normalized)) !== null) {
		matched = true;
		// Use upper bound if range (e.g. "10-15 min" -> 15)
		const val = parseInt(match[2] ?? match[1], 10);
		if (!isNaN(val)) {
			totalMinutes += val;
		}
	}

	// Fallback: If no unit matched, check if it's strictly a raw number of digits (assumed minutes)
	if (!matched) {
		if (/^\d+$/.test(normalized)) {
			return parseInt(normalized, 10);
		}
		return undefined;
	}

	return totalMinutes;
}

/**
 * Formats a minute count into an ISO 8601 duration string (e.g. "PT1H15M", "PT25M").
 */
export function minutesToIsoDuration(minutes: number): string {
	if (minutes <= 0) return 'PT0M';

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	let iso = 'PT';
	if (hours > 0) {
		iso += `${hours}H`;
	}
	if (remainingMinutes > 0 || hours === 0) {
		iso += `${remainingMinutes}M`;
	}

	return iso;
}

/**
 * Parses a duration string and formats it as an ISO 8601 duration.
 */
export function formatIsoDuration(durationStr?: string): string | undefined {
	const minutes = parseToMinutes(durationStr);
	if (minutes === undefined) return undefined;
	return minutesToIsoDuration(minutes);
}

/**
 * Calculates totalTime in ISO 8601 format by summing prepTime and cookTime.
 */
export function calculateTotalIsoDuration(prepTime?: string, cookTime?: string): string | undefined {
	const prepMin = parseToMinutes(prepTime);
	const cookMin = parseToMinutes(cookTime);

	if (prepMin === undefined && cookMin === undefined) {
		return undefined;
	}

	const total = (prepMin ?? 0) + (cookMin ?? 0);
	return minutesToIsoDuration(total);
}
