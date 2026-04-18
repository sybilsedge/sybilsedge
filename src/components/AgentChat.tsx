import { useState, useRef, useEffect, useCallback } from 'react';

const SESSION_KEY = 'sybil-twin-session-id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LEN = 2000;

interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	streaming?: boolean;
	error?: boolean;
}

function getOrCreateSession(): string {
	let id = localStorage.getItem(SESSION_KEY);
	if (!id || !UUID_RE.test(id)) {
		id = crypto.randomUUID();
		localStorage.setItem(SESSION_KEY, id);
	}
	return id;
}

export default function AgentChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [isStreaming, setIsStreaming] = useState(false);
	const [sessionId, setSessionId] = useState('');
	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Initialise session ID client-side only (avoids SSR/hydration mismatch)
	useEffect(() => {
		setSessionId(getOrCreateSession());
	}, []);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const sendMessage = useCallback(async () => {
		const trimmed = input.trim();
		if (!trimmed || isStreaming || !sessionId) return;
		if (trimmed.length > MAX_LEN) return;

		const userId = crypto.randomUUID();
		const assistantId = crypto.randomUUID();

		setMessages((prev) => [
			...prev,
			{ id: userId, role: 'user', content: trimmed },
			{ id: assistantId, role: 'assistant', content: '', streaming: true },
		]);
		setInput('');
		setIsStreaming(true);

		try {
			const res = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId, message: trimmed }),
			});

			if (!res.ok || !res.body) {
				const errData = await res.json().catch(() => ({ error: 'Request failed.' })) as { error?: string };
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantId
							? { ...m, content: errData.error ?? 'An error occurred. Please try again.', streaming: false, error: true }
							: m
					)
				);
				return;
			}

			const reader = res.body.getReader();
			const dec = new TextDecoder();
			let accumulated = '';
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += dec.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const raw = line.slice(6).trim();
					if (raw === '[DONE]') continue;
					try {
						const parsed = JSON.parse(raw) as { response?: string };
						if (parsed.response) {
							accumulated += parsed.response;
							const snap = accumulated;
							setMessages((prev) =>
								prev.map((m) =>
									m.id === assistantId ? { ...m, content: snap } : m
								)
							);
						}
					} catch {
						// Ignore malformed SSE frames
					}
				}
			}

			setMessages((prev) =>
				prev.map((m) =>
					m.id === assistantId ? { ...m, streaming: false } : m
				)
			);
		} catch {
			setMessages((prev) =>
				prev.map((m) =>
					m.id === assistantId
						? { ...m, content: 'Connection error. Please try again.', streaming: false, error: true }
						: m
				)
			);
		} finally {
			setIsStreaming(false);
			inputRef.current?.focus();
		}
	}, [input, isStreaming, sessionId]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
		const el = e.currentTarget;
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
	};

	return (
		<div className="flex flex-col blueprint-border rounded-md bg-black/35" style={{ minHeight: '520px', maxHeight: '72vh' }}>
			{/* ── Header ───────────────────────────────────────────────────── */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-cyan-300/15 shrink-0">
				<div className="flex items-center gap-2">
					<span className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_6px_#39ff14]" aria-hidden="true" />
					<span className="font-tech text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">SYBIL.TWIN</span>
				</div>
				<span className="font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-300/35">
					Workers AI · Llama 3.3 70B
				</span>
			</div>

			{/* ── Message list ─────────────────────────────────────────────── */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
				{messages.length === 0 && (
					<div className="text-center py-10">
						<p className="font-tech text-[10px] uppercase tracking-[0.22em] text-cyan-300/35 mb-3">
							// SYSTEM ONLINE
						</p>
						<p className="text-sm text-slate-400/80 max-w-sm mx-auto leading-relaxed">
							Ask me about my background, projects, writing, or career. I&rsquo;m Sybil&rsquo;s digital twin.
						</p>
					</div>
				)}
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
					>
						<span
							className={`font-tech text-[9px] uppercase tracking-[0.2em] ${
								msg.role === 'user' ? 'text-cyan-300/50' : 'text-[#39ff14]/60'
							}`}
						>
							{msg.role === 'user' ? 'YOU' : 'SYBIL.TWIN'}
						</span>
						<div
							className={`max-w-[88%] rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
								msg.role === 'user'
									? 'bg-cyan-300/8 border border-cyan-300/20 text-slate-100'
									: msg.error
									? 'bg-rose-950/30 border border-rose-400/30 text-rose-200'
									: 'bg-black/40 border border-[#39ff14]/15 text-slate-200/90'
							}`}
						>
							{msg.content || (msg.streaming ? null : '\u00a0')}
							{msg.streaming && (
								<span
									className="inline-block w-1.5 h-3.5 bg-[#39ff14] ml-0.5 animate-pulse align-middle"
									aria-label="Generating response"
								/>
							)}
						</div>
					</div>
				))}
				<div ref={bottomRef} />
			</div>

			{/* ── Input bar ────────────────────────────────────────────────── */}
			<div className="px-4 py-3 border-t border-cyan-300/15 shrink-0">
				<div className="flex items-end gap-2">
					<span
						className="font-tech text-[#39ff14] text-sm pb-2 shrink-0 select-none"
						aria-hidden="true"
					>
						&gt;&gt;
					</span>
					<textarea
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						onInput={autoResize}
						placeholder="Ask me anything…"
						disabled={isStreaming || !sessionId}
						rows={1}
						maxLength={MAX_LEN}
						aria-label="Message input"
						className="flex-1 resize-none bg-transparent font-tech text-sm text-slate-100 placeholder:text-cyan-300/25 outline-none py-2 overflow-y-auto disabled:opacity-50 leading-relaxed"
					/>
					<button
						type="button"
						onClick={sendMessage}
						disabled={isStreaming || !input.trim() || !sessionId}
						aria-label="Send message"
						className="shrink-0 rounded px-3 py-2 font-tech text-[11px] uppercase tracking-[0.16em] transition-colors disabled:opacity-30 text-[#39ff14] border border-[#39ff14]/30 hover:bg-[#39ff14]/10 disabled:cursor-not-allowed"
					>
						{isStreaming ? '…' : 'Send'}
					</button>
				</div>
				<p className="font-tech text-[9px] text-cyan-300/25 mt-1 text-right" aria-hidden="true">
					Enter to send · Shift+Enter for newline
				</p>
			</div>
		</div>
	);
}
