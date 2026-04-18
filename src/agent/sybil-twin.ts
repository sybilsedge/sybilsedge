import type { ConversationRecord, StoredMessage, ChatMessage } from './types';
import { MAX_HISTORY_MESSAGES, SESSION_TTL_MS } from './types';

/**
 * SybilTwinDO — Durable Object that persists conversation history per session.
 *
 * Routes:
 *   GET  /history  → returns recent ChatMessage[] (filtered to last 30 days)
 *   POST /append   → accepts ChatMessage[], appends to history, resets 30-day alarm
 *
 * The DO alarm fires after SESSION_TTL_MS of inactivity and wipes all storage,
 * providing automatic 30-day session expiry with no external cron needed.
 */
export class SybilTwinDO {
	private state: DurableObjectState;

	constructor(state: DurableObjectState) {
		this.state = state;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'GET' && url.pathname === '/history') {
			const messages = await this.getHistory();
			return Response.json(messages);
		}

		if (request.method === 'POST' && url.pathname === '/append') {
			let incoming: ChatMessage[];
			try {
				incoming = await request.json();
			} catch {
				return new Response('Invalid JSON', { status: 400 });
			}
			await this.appendMessages(incoming);
			// Reset the eviction alarm each time the session is active
			await this.state.storage.setAlarm(Date.now() + SESSION_TTL_MS);
			return new Response(null, { status: 204 });
		}

		return new Response('Not Found', { status: 404 });
	}

	/** DO alarm handler — evicts the full session after TTL. */
	async alarm(): Promise<void> {
		await this.state.storage.deleteAll();
	}

	private async getHistory(): Promise<ChatMessage[]> {
		const record = await this.state.storage.get<ConversationRecord>('conversation');
		if (!record) return [];
		const cutoff = Date.now() - SESSION_TTL_MS;
		return record.messages
			.filter((m) => m.ts > cutoff)
			.map(({ role, content }) => ({ role, content }));
	}

	private async appendMessages(incoming: ChatMessage[]): Promise<void> {
		const existing = await this.state.storage.get<ConversationRecord>('conversation');
		const record: ConversationRecord = existing ?? {
			messages: [] as StoredMessage[],
			createdAt: Date.now(),
		};
		const ts = Date.now();
		const stamped: StoredMessage[] = incoming.map((m) => ({ ...m, ts }));
		const all = [...record.messages, ...stamped];
		// Trim oldest messages to stay within cap
		record.messages = all.slice(-MAX_HISTORY_MESSAGES);
		await this.state.storage.put<ConversationRecord>('conversation', record);
	}
}
