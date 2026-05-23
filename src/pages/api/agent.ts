import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isValidSessionId, isValidMessage } from '../../agent/types';
import { buildSystemPrompt } from '../../agent/context';
import { loadKbContext, type KbContext } from '../../agent/r2-context';

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
	let kbContext: KbContext | undefined;
	if (env.SYBIL_TWIN_KB) {
		try {
			kbContext = await loadKbContext(env.SYBIL_TWIN_KB);
			if (kbContext) {
				console.log(
					`[agent] R2 KB loaded: style=${kbContext.style.length} chars, facts=${kbContext.facts.length} chars`
				);
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

export const POST: APIRoute = async (context) => {
	const { request, locals } = context;
	const cfContext = (locals as { cfContext?: { waitUntil?: (promise: Promise<unknown>) => void } })
		.cfContext;
	const reqId = crypto.randomUUID().slice(0, 8);
	const t0 = Date.now();

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
	let history: Array<{ role: string; content: string }> = [];
	let stub: DurableObjectStub | null = null;

	if (env.SYBIL_TWIN) {
		try {
			const doId = env.SYBIL_TWIN.idFromName(sessionId as string);
			stub = env.SYBIL_TWIN.get(doId);
			const histRes = await stub.fetch(new Request(`${DO_BASE}/history`));
			if (histRes.ok) history = await histRes.json();
		} catch (err) {
			// Non-fatal: proceed with empty history
			console.error(`[agent:${reqId}] history fetch failed:`, err);
		}
	} else {
		console.warn(`[agent:${reqId}] SYBIL_TWIN binding not found; proceeding without history`);
	}

	const isNewSession = history.length === 0;
	const userMessage = userContent;

	// Fire-and-forget — do NOT await
	if (env.DB) {
		const dbLogPromise = env.DB.prepare(
			`INSERT INTO twin_interactions (timestamp, session_id, message, is_new_session, session_status, user_agent, referrer)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(
				new Date().toISOString(),
				sessionId,       // from request body
				userMessage,     // the visitor's question
				isNewSession ? 1 : 0,
				isNewSession ? 'new' : 'existing',
				request.headers.get('user-agent') ?? null,
				request.headers.get('referer') ?? null
			)
			.run()
			.catch((err: any) => console.error('D1 log failed:', err));

		cfContext?.waitUntil?.(dbLogPromise);
	}

	// ── 3. Build messages for the model ───────────────────────────────────
	let systemPrompt: string;
	try {
		systemPrompt = await getSystemPrompt();
	} catch (err) {
		console.error(`[agent:${reqId}] context build failed:`, err);
		systemPrompt =
			"You ARE Sybil Melton — her digital twin. Always speak in the first person (I, me, my). Never use third-person pronouns about yourself. Answer questions about your professional background, creative projects, and interests honestly and helpfully.";
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
	const encoder = new TextEncoder();
	let fullResponse = '';
	const closeWriter = async () => {
		try {
			await writer.close();
		} catch (err) {
			console.error(`[agent:${reqId}] stream close failed:`, err);
		}
	};

	(async () => {
		const reader = aiStream.getReader();
		let buffer = '';
		let insideThink = false;
		const TAG_WINDOW = 8; // length of '</think>' (longest tag)

		/**
		 * Two independent look-behind buffers so a token that both emits
		 * clean text AND opens/closes a think block cannot clobber the
		 * other branch's carry.
		 *
		 * cleanCarry — trailing clean-text chars held back to detect a
		 *              split <think> open tag across SSE frames.
		 * thinkCarry — trailing inside-think chars held back to detect a
		 *              split </think> close tag across SSE frames.
		 */
		let cleanCarry = '';
		let thinkCarry = '';

		/** Flush held-back clean text to the client. */
		const flushCleanCarry = async () => {
			if (!cleanCarry) return;
			fullResponse += cleanCarry;
			await writer.write(encoder.encode(
				`data: ${JSON.stringify({ response: cleanCarry })}\n\n`
			));
			cleanCarry = '';
		};

		/**
		 * Process one SSE line: strip <think>…</think> blocks,
		 * emit `thinking` signals, and forward only clean tokens.
		 *
		 * Tags split across tokens are handled by prepending the
		 * appropriate carry buffer, running the state machine, then
		 * holding back the trailing TAG_WINDOW chars in the correct
		 * buffer for the next call.
		 */
		const processSseLine = async (line: string) => {
			const trimmed = line.trim();
			if (!trimmed.startsWith('data: ')) return;
			if (trimmed.includes('[DONE]')) {
				await flushCleanCarry();
				await writer.write(encoder.encode(line + '\n'));
				return;
			}
			try {
				const data = JSON.parse(trimmed.slice(6)) as { response?: string };
				if (!data.response) return;

				// Prepend the carry that matches our current state
				let token: string;
				if (insideThink) {
					token = thinkCarry + data.response;
					thinkCarry = '';
				} else {
					token = cleanCarry + data.response;
					cleanCarry = '';
				}
				let clean = '';

				// State machine for <think>…</think> boundaries
				while (token.length > 0) {
					if (!insideThink) {
						const idx = token.indexOf('<think>');
						if (idx !== -1) {
							const preThink = clean + token.slice(0, idx);
							if (preThink) {
								fullResponse += preThink;
								await writer.write(encoder.encode(
									`data: ${JSON.stringify({ response: preThink })}\n\n`
								));
							}
							clean = '';
							insideThink = true;
							token = token.slice(idx + 7);
							await writer.write(encoder.encode(
								`data: ${JSON.stringify({ response: '', thinking: true })}\n\n`
							));
						} else {
							clean += token;
							token = '';
						}
					} else {
						const idx = token.indexOf('</think>');
						if (idx !== -1) {
							insideThink = false;
							token = token.slice(idx + 8);
							await writer.write(encoder.encode(
								`data: ${JSON.stringify({ response: '', thinking: false })}\n\n`
							));
						} else {
							// Retain trailing TAG_WINDOW chars in case </think>
							// straddles this token and the next one.
							thinkCarry = token.length > TAG_WINDOW
								? token.slice(-TAG_WINDOW)
								: token;
							token = ''; // drop the rest — still inside think block
						}
					}
				}

				if (clean) {
					// If insideThink was true at call entry, cleanCarry was NOT
					// prepended to the token — merge it now so it isn't lost.
					const merged = cleanCarry + clean;
					cleanCarry = '';

					// Hold back the trailing TAG_WINDOW chars in case a
					// <think> tag straddles this token and the next one.
					if (merged.length > TAG_WINDOW) {
						const emit = merged.slice(0, -TAG_WINDOW);
						cleanCarry = merged.slice(-TAG_WINDOW);
						fullResponse += emit;
						await writer.write(encoder.encode(
							`data: ${JSON.stringify({ response: emit })}\n\n`
						));
					} else {
						cleanCarry = merged;
					}
				}
			} catch {
				// Ignore malformed or incomplete SSE lines
			}
		};

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				// Keep the last element — it may be an incomplete line
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					await processSseLine(line);
				}
			}
		} catch (err) {
			console.error(`[agent:${reqId}] stream read error:`, err);
		} finally {
			// Flush any remaining bytes held by the decoder
			buffer += decoder.decode();
			if (buffer) await processSseLine(buffer);
			// Flush any remaining look-behind carry to the client
			await flushCleanCarry();

			if (insideThink) {
				try {
					await writer.write(encoder.encode(
						`data: ${JSON.stringify({ response: '', thinking: false })}\n\n`
					));
				} catch (err) {
					console.error('[agent] failed to write terminal thinking:false frame:', err);
				}
			}

			reader.releaseLock();

			// Safety-net regex to catch edge cases (e.g. tags split across tokens)
			fullResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trimStart();

			// ── 6. Persist both turns to the DO after stream completes ─────
			if (stub) {
				const appendPromise = (async () => {
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
				})();

				if (cfContext) {
					cfContext.waitUntil?.(appendPromise);
					await closeWriter();
				} else {
					await appendPromise;
					await closeWriter();
				}
			} else {
				await closeWriter();
			}
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
