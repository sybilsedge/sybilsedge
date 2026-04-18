/**
 * r2-context.ts — Private R2 knowledge-base loader for SybilTwin.
 *
 * Reads markdown documents stored under the `kb/` prefix of the private
 * SYBIL_TWIN_KB R2 bucket, strips YAML front-matter, and returns a single
 * size-bounded plain-text string for inclusion in the system prompt.
 *
 * Key layout expected in the bucket:
 *   kb/<slug>.md          — personal notes / thinking documents
 *   index/manifest.json   — optional; reserved for future metadata use
 *
 * Security: the bucket is private (no public URL).  Only this server-side
 * module reads from it; the raw content is never forwarded to clients.
 */

/** Maximum number of kb/ documents to load per prompt build. */
export const MAX_KB_FILES = 20;

/**
 * Maximum total characters contributed by R2 documents to the system prompt
 * (including the `---` dividers inserted between sections at join-time).
 * At ~4 chars/token this is roughly 3 000 tokens — generous but conservative
 * given the 128 k-token context window of Llama 3.3 70B.
 */
export const MAX_KB_CHARS = 12_000;

/** Separator inserted between sections at join-time. */
const DIVIDER = '\n\n---\n\n';

/** Max concurrent R2 get() calls per prompt build. */
const FETCH_CONCURRENCY = 5;

/**
 * Strips YAML front-matter from a markdown string.
 * Handles the common `---\n…\n---\n` delimiter pattern.
 */
function stripFrontmatter(raw: string): string {
	if (!raw.startsWith('---')) return raw.trim();
	const end = raw.indexOf('\n---', 3);
	if (end === -1) return raw.trim();
	return raw.slice(end + 4).trim();
}

/**
 * Derives a human-readable section title from an R2 object key.
 * e.g. "kb/how-i-think-about-systems.md" → "How I Think About Systems"
 */
function titleFromKey(key: string): string {
	const base = key.split('/').pop()?.replace(/\.md$/i, '') ?? key;
	return base
		.split(/[-_]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

type FetchSuccess = { key: string; raw: string };
type FetchFailure = { key: string; error: unknown };
type FetchResult = FetchSuccess | FetchFailure;

/** Fetches a single R2 object and returns its text content. */
async function fetchOne(bucket: R2Bucket, key: string): Promise<FetchSuccess> {
	const item = await bucket.get(key);
	if (!item) throw new Error('key not found in bucket');
	const raw = await item.text();
	return { key, raw };
}

/**
 * Fetches multiple R2 objects in parallel, honouring FETCH_CONCURRENCY.
 * Results are returned in the same order as the input keys so the prompt
 * section order remains deterministic.
 */
async function fetchAll(bucket: R2Bucket, keys: string[]): Promise<FetchResult[]> {
	const results: FetchResult[] = new Array(keys.length);
	for (let batchStart = 0; batchStart < keys.length; batchStart += FETCH_CONCURRENCY) {
		const batch = keys.slice(batchStart, batchStart + FETCH_CONCURRENCY);
		const settled = await Promise.allSettled(batch.map((k) => fetchOne(bucket, k)));
		for (let batchIndex = 0; batchIndex < settled.length; batchIndex++) {
			const r = settled[batchIndex];
			results[batchStart + batchIndex] =
				r.status === 'fulfilled' ? r.value : { key: batch[batchIndex], error: r.reason };
		}
	}
	return results;
}

/**
 * Loads markdown documents from the private R2 knowledge-base bucket and
 * returns them as a single, size-bounded plain-text string suitable for
 * inclusion in the SybilTwin system prompt.
 *
 * - Only objects under the `kb/` prefix with a `.md` extension are read.
 * - Objects are fetched in parallel (up to FETCH_CONCURRENCY at a time).
 * - Errors on individual files are logged and skipped (non-fatal).
 * - Content is hard-truncated at MAX_KB_CHARS (including dividers) to guard
 *   the context budget.
 *
 * @returns Plain-text sections joined by `---` dividers, or an empty string
 *          if the bucket is empty or all reads fail.
 */
export async function loadKbContext(bucket: R2Bucket): Promise<string> {
	let listed: R2Objects;
	try {
		listed = await bucket.list({ prefix: 'kb/', limit: MAX_KB_FILES + 1 });
	} catch (err) {
		console.error('[r2-context] bucket.list failed:', err);
		return '';
	}

	const mdKeys = listed.objects
		.filter((o) => o.key.endsWith('.md') || o.key.endsWith('.MD'))
		.slice(0, MAX_KB_FILES)
		.map((o) => o.key);

	if (mdKeys.length === 0) {
		console.log('[r2-context] no kb/ markdown objects found in bucket');
		return '';
	}

	const fetched = await fetchAll(bucket, mdKeys);

	const sections: string[] = [];
	// totalChars tracks the exact byte length of sections.join(DIVIDER) so
	// that the MAX_KB_CHARS limit accurately reflects what ends up in the prompt.
	let totalChars = 0;

	for (const result of fetched) {
		if ('error' in result) {
			console.error(`[r2-context] failed to fetch "${result.key}":`, result.error);
			continue;
		}

		const content = stripFrontmatter(result.raw);
		if (!content) continue;

		const section = `### ${titleFromKey(result.key)}\n\n${content}`;
		// Each section after the first contributes an additional DIVIDER in the
		// final join output, so we must include that overhead in the budget check.
		const dividerCost = sections.length > 0 ? DIVIDER.length : 0;
		const addCost = section.length + dividerCost;

		if (totalChars + addCost > MAX_KB_CHARS) {
			const remaining = MAX_KB_CHARS - totalChars - dividerCost;
			if (remaining > 300) {
				const truncated = section.slice(0, remaining);
				sections.push(truncated);
				totalChars += truncated.length + dividerCost;
				console.log(`[r2-context] KB budget reached — truncated "${result.key}"`);
			}
			break;
		}

		sections.push(section);
		totalChars += addCost;
	}

	console.log(
		`[r2-context] loaded ${sections.length}/${mdKeys.length} files — ${totalChars} chars`
	);
	return sections.join(DIVIDER);
}

