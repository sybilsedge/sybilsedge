import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isValidSessionId, isValidMessage } from '../../agent/types';
import { buildSystemPrompt } from '../../agent/context';
import { loadKbContext } from '../../agent/r2-context';

export const prerender = false;

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/** Arbitrary base URL — DO stubs route by binding, not real HTTP. */
const DO_BASE = 'http://do';

// Module-level cache: the prompt is built once per worker isolate and reused.
// On failure the cached Promise is cleared so the next request retries.
let systemPromptCache: Promise<string> | null = null;

/**
 * Builds the full system prompt with R2 KB context merged in.
 * R2 load failures are non-fatal — the prompt falls back to local data only.
 */
async function buildPromptWithKb(): Promise<string> {
	let kbContext: string | undefined;
	if (env.SYBIL_TWIN_KB) {
		try {
			kbContext = await loadKbContext(env.SYBIL_TWIN_KB);
			if (kbContext) {
				console.log(`[agent] R2 KB loaded: ${kbContext.length} chars`);
			}
		} catch (err) {
			console.error('[agent] R2 KB load failed; proceeding without KB context:', err);
		}
	}
	return buildSystemPrompt(kbContext);
}

function getSystemPrompt(): Promise<string> {
	if (!systemPromptCache) {
		systemPromptCache = buildPromptWithKb().catch((err) => {
			console.error('[agent] buildSystemPrompt failed; cache cleared for retry:', err);
			systemPromptCache = null;
			throw err;
		});
	}
	return systemPromptCache;
}

export const POST: APIRoute = async ({ request }) => {
	const reqId = crypto.randomUUID().slice(0, 8);
	const t0 = Date.now();

	// ── 0. Preview guard — DO binding is absent in preview deployments ─────
	if (env.ENVIRONMENT === 'preview') {
		return Response.json(
			{ error: 'Digital Twin is not available in preview deployments.' },
			{ status: 503 }
		);
	}

	// ── 1. Parse & validate input ──────────────────────────────────────────
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (typeof body !== 'object' || body === null) {
		return Response.json({ error: 'Body must be a JSON object' }, { status: 400 });
	}

	const { sessionId, message } = body as Record<string, unknown>;

	if (!isValidSessionId(sessionId)) {
		return Response.json(
			{ error: 'Invalid sessionId — must be a UUID v4 string' },
			{ status: 400 }
		);
	}

	if (!isValidMessage(message)) {
		return Response.json(
			{ error: 'Invalid message — must be 1–2000 non-whitespace characters' },
			{ status: 400 }
		);
	}

	const userContent = (message as string).trim();

	// ── 2. Load conversation history from Durable Object ──────────────────
	const doId = env.SYBIL_TWIN.idFromName(sessionId as string);
	const stub = env.SYBIL_TWIN.get(doId);

	let history: Array<{ role: string; content: string }> = [];
	try {
		const histRes = await stub.fetch(new Request(`${DO_BASE}/history`));
		if (histRes.ok) history = await histRes.json();
	} catch (err) {
		// Non-fatal: proceed with empty history
		console.error(`[agent:${reqId}] history fetch failed:`, err);
	}

	// ── 3. Build messages for the model ───────────────────────────────────
	let systemPrompt: string;
	try {
		systemPrompt = await getSystemPrompt();
	} catch (err) {
		console.error(`[agent:${reqId}] context build failed:`, err);
		systemPrompt =
			"You are Sybil Melton's digital twin. Answer questions about her professional background honestly and helpfully.";
	}

	const messages = [
		{ role: 'system', content: systemPrompt },
		...history,
		{ role: 'user', content: userContent },
	];

	// ── 4. Call Workers AI with streaming ─────────────────────────────────
	let aiStream: ReadableStream<Uint8Array>;
	try {
		const result = await env.AI.run(MODEL, {
			messages,
			stream: true,
			max_tokens: 1024,
		});
		aiStream = result as ReadableStream<Uint8Array>;
	} catch (err) {
		console.error(`[agent:${reqId}] AI.run failed (${Date.now() - t0}ms):`, err);
		return Response.json(
			{ error: 'Model unavailable — please try again in a moment.' },
			{ status: 503 }
		);
	}

	// ── 5. Stream response to client while buffering for persistence ───────
	const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
	const writer = writable.getWriter();
	const decoder = new TextDecoder();
	let fullResponse = '';

	(async () => {
		const reader = aiStream.getReader();
		let buffer = '';

		const appendResponseFromSseLine = (line: string) => {
			const trimmedLine = line.trim();
			if (!trimmedLine.startsWith('data: ') || trimmedLine.includes('[DONE]')) return;
			try {
				const data = JSON.parse(trimmedLine.slice(6)) as { response?: string };
				if (data.response) fullResponse += data.response;
			} catch {
				// Ignore malformed or incomplete SSE lines until they can be completed
			}
		};

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				await writer.write(value);
				// Collect tokens from SSE lines to form the complete response
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				// Keep the last element in the buffer — it may be an incomplete line
				// that will be completed by the next chunk.
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					appendResponseFromSseLine(line);
				}
			}
		} catch (err) {
			console.error(`[agent:${reqId}] stream read error:`, err);
		} finally {
			// Flush any remaining bytes held by the decoder
			buffer += decoder.decode();
			if (buffer) appendResponseFromSseLine(buffer);

			reader.releaseLock();
			// Close the writer immediately so the client sees the stream end
			// before the (slower) DO persistence call below.
			writer.close();

			// ── 6. Persist both turns to the DO after stream completes ─────
			if (fullResponse) {
				try {
					await stub.fetch(
						new Request(`${DO_BASE}/append`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify([
								{ role: 'user', content: userContent },
								{ role: 'assistant', content: fullResponse },
							]),
						})
					);
				} catch (err) {
					console.error(`[agent:${reqId}] DO append failed:`, err);
				}
			}
			console.log(
				`[agent:${reqId}] done — ${fullResponse.length} chars in ${Date.now() - t0}ms`
			);
		}
	})();

	return new Response(readable, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no',
		},
	});
};
