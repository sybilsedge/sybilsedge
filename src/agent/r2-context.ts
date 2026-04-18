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
 * Maximum total characters contributed by R2 documents to the system prompt.
 * At ~4 chars/token this is roughly 3 000 tokens — generous but conservative
 * given the 128 k-token context window of Llama 3.3 70B.
 */
export const MAX_KB_CHARS = 12_000;

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

/**
 * Loads markdown documents from the private R2 knowledge-base bucket and
 * returns them as a single, size-bounded plain-text string suitable for
 * inclusion in the SybilTwin system prompt.
 *
 * - Only objects under the `kb/` prefix with a `.md` extension are read.
 * - Errors on individual files are logged and skipped (non-fatal).
 * - Content is hard-truncated at MAX_KB_CHARS to guard the context budget.
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

	const sections: string[] = [];
	let totalChars = 0;

	for (const key of mdKeys) {
		let item: R2ObjectBody | null;
		try {
			item = await bucket.get(key);
		} catch (err) {
			console.error(`[r2-context] bucket.get failed for "${key}":`, err);
			continue;
		}
		if (!item) {
			console.warn(`[r2-context] key not found in bucket: "${key}"`);
			continue;
		}

		let raw: string;
		try {
			raw = await item.text();
		} catch (err) {
			console.error(`[r2-context] text() failed for "${key}":`, err);
			continue;
		}

		const content = stripFrontmatter(raw);
		if (!content) continue;

		const title = titleFromKey(key);
		const section = `### ${title}\n\n${content}`;

		if (totalChars + section.length > MAX_KB_CHARS) {
			const remaining = MAX_KB_CHARS - totalChars;
			if (remaining > 300) {
				sections.push(section.slice(0, remaining));
				console.log(`[r2-context] KB budget reached — truncated "${key}"`);
			}
			break;
		}

		sections.push(section);
		totalChars += section.length;
	}

	console.log(
		`[r2-context] loaded ${sections.length}/${mdKeys.length} files — ${totalChars} chars`
	);
	return sections.join('\n\n---\n\n');
}
