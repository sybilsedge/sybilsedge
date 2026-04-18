/** Maximum characters allowed in a single user message. */
export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Maximum number of stored messages per session.
 * Pairs are stored (user + assistant), so this covers up to 25 exchanges.
 */
export const MAX_HISTORY_MESSAGES = 50;

/** Sessions are evicted after 30 days of inactivity. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface StoredMessage extends ChatMessage {
	/** Epoch milliseconds — used for TTL filtering. */
	ts: number;
}

export interface ConversationRecord {
	messages: StoredMessage[];
	createdAt: number;
}

/** UUID v4 pattern — used to validate client-supplied session IDs. */
const SESSION_ID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(id: unknown): id is string {
	return typeof id === 'string' && SESSION_ID_RE.test(id);
}

export function isValidMessage(msg: unknown): msg is string {
	return (
		typeof msg === 'string' &&
		msg.trim().length > 0 &&
		msg.length <= MAX_MESSAGE_LENGTH
	);
}
