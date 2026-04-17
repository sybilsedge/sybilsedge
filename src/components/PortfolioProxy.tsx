import { useAgent } from "agents-sdk/react";
import { useRef, useState } from "react";

type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
};

const INIT_MESSAGE: ChatMessage = {
	id: "init",
	role: "assistant",
	content:
		"Uplink established. Sybil Proxy online. Professional archives are indexed and ready for query. Where should we begin the deep-dive?",
};

function TerminalMessage({ message }: { message: ChatMessage }) {
	return (
		<div
			className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
		>
			<div
				className={
					message.role === "user"
						? "max-w-[80%] rounded px-3 py-2 bg-cyan-950/50 border border-cyan-400/30"
						: "max-w-[85%] rounded px-3 py-2 bg-black/60 border border-[#39ff14]/20"
				}
			>
				{message.role === "assistant" && (
					<p className="font-tech text-[10px] uppercase tracking-[0.14em] text-[#39ff14] mb-1">
						sybil.proxy
					</p>
				)}
				<p className="text-sm text-slate-300/90 whitespace-pre-wrap">{message.content}</p>
			</div>
		</div>
	);
}

export default function PortfolioProxy() {
	const [messages, setMessages] = useState<ChatMessage[]>([INIT_MESSAGE]);
	const [input, setInput] = useState("");
	const [connected, setConnected] = useState(false);
	const [streaming, setStreaming] = useState(false);

	const streamingIdRef = useRef<string | null>(null);
	const streamBufRef = useRef("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const agent = useAgent({
		agent: "sybil-proxy-agent",
		name: "default",
		prefix: "api/agent",
		onOpen() {
			setConnected(true);
			// Request any persisted message history from the agent.
			agent.send(JSON.stringify({ type: "cf_agent_chat_init" }));
		},
		onClose() {
			setConnected(false);
		},
		onError() {
			setConnected(false);
		},
		onMessage(event) {
			const raw = event.data as string;

			// Check for history load (initial messages from the agent).
			try {
				const parsed = JSON.parse(raw) as { type?: string; messages?: ChatMessage[] };
				if (parsed.type === "cf_agent_chat_messages" && Array.isArray(parsed.messages)) {
					// Replace synthetic init message with persisted session history.
					const history = parsed.messages.map(m => ({
						id: m.id,
						role: m.role as "user" | "assistant",
						content: typeof m.content === "string" ? m.content : "",
					}));
					if (history.length > 0) {
						setMessages(history);
					}
					return;
				}
			} catch {
				// Not JSON — fall through to data stream parsing.
			}

			// Parse AI SDK data stream chunks (e.g. "0:\"text\"\n", "d:{...}\n").
			const lines = raw.split("\n").filter(Boolean);
			for (const line of lines) {
				if (line.startsWith("0:")) {
					// Text delta.
					try {
						const delta = JSON.parse(line.slice(2)) as string;
						streamBufRef.current += delta;
						const id = streamingIdRef.current;
						if (id) {
							setMessages(prev =>
								prev.map(m => (m.id === id ? { ...m, content: streamBufRef.current } : m))
							);
						}
					} catch {
						// Skip malformed chunk.
					}
				} else if (line.startsWith("d:")) {
					// Finish marker.
					setStreaming(false);
					streamingIdRef.current = null;
					streamBufRef.current = "";
					// Scroll to bottom after response completes.
					requestAnimationFrame(() => {
						messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
					});
				}
			}
		},
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = input.trim();
		if (!trimmed || streaming) return;

		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: trimmed,
		};
		const asstId = crypto.randomUUID();
		streamingIdRef.current = asstId;
		streamBufRef.current = "";

		setMessages(prev => [
			...prev,
			userMsg,
			{ id: asstId, role: "assistant", content: "" },
		]);
		setInput("");
		setStreaming(true);

		agent.send(
			JSON.stringify({
				type: "cf_agent_use_chat_request",
				id: crypto.randomUUID(),
				messages: [...messages, userMsg].map(m => ({
					id: m.id,
					role: m.role,
					content: m.content,
				})),
				init: {},
			})
		);

		requestAnimationFrame(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		});
	}

	return (
		<div className="mx-auto w-full max-w-4xl">
			{/* Header */}
			<header className="mb-4 rounded-md blueprint-border bg-black/35 p-4">
				<p className="font-tech text-[11px] uppercase tracking-[0.22em] text-cyan-300/75">
					Terminal Interface
				</p>
				<h1 className="font-orbitron mt-1 text-xl uppercase tracking-[0.12em] text-cyan-100">
					Sybil Proxy
				</h1>
				<div className="mt-2 flex items-center gap-2">
					<span
						className={`h-2 w-2 rounded-full ${connected ? "bg-[#39ff14]" : "bg-amber-400"}`}
						aria-hidden="true"
					/>
					<span className="font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-300/60">
						{connected ? "uplink established" : "connecting…"}
					</span>
				</div>
			</header>

			{/* Message feed */}
			<div
				role="log"
				aria-live="polite"
				aria-label="Proxy conversation"
				className="mb-4 h-96 overflow-y-auto rounded-md blueprint-border bg-black/45 p-4 space-y-3"
			>
				{messages.map(msg => (
					<TerminalMessage key={msg.id} message={msg} />
				))}
				{streaming && streamingIdRef.current === null && (
					<div className="flex justify-start">
						<div className="rounded px-3 py-2 bg-black/60 border border-[#39ff14]/20">
							<p className="font-tech text-[10px] uppercase tracking-[0.14em] text-[#39ff14] mb-1">
								sybil.proxy
							</p>
							<span className="animate-pulse text-slate-400 text-sm">processing…</span>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<form onSubmit={handleSubmit} className="flex gap-2">
				<input
					value={input}
					onChange={e => setInput(e.target.value)}
					placeholder="Enter query…"
					aria-label="Query input"
					disabled={streaming}
					className="flex-1 rounded blueprint-border bg-black/35 px-3 py-2 font-tech text-sm text-slate-300/90 placeholder:text-slate-600/70 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={streaming || !input.trim()}
					className="rounded blueprint-border bg-black/50 px-4 py-2 font-tech text-xs uppercase tracking-[0.14em] text-cyan-300 hover:bg-cyan-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				>
					Submit
				</button>
			</form>

			<p className="mt-3 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-300/40 text-center">
				professional archive · sybilsedge.com
			</p>
		</div>
	);
}
