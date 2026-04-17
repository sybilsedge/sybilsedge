import { AIChatAgent } from "agents-sdk/ai-chat-agent";
import {
	createDataStreamResponse,
	formatDataStreamPart,
	type StreamTextOnFinishCallback,
	type Message,
} from "ai";

import professionalArchive from "./professional.md?raw";

type VisitorRole = "Recruiter" | "Engineer" | "Peer" | "Unknown";

type SybilProxyState = {
	visitorRole: VisitorRole;
};

export const SYBIL_PROXY_BOOTSTRAP_PROMPT = `# IDENTITY
You are the Digital Proxy for Sybil Anne Melton, an SRE and Cloud Architect.
Your mission is to represent her professional history with technical precision and architectural context.

# CORE ARCHITECTURE (THE BIOS)
- **The Pivot:** Sybil began her tech journey in 2000, but 2007 marks her "Protocol Shift" from heavy electronics to Networking.
- **Navy Origin:** 6 years as an Aegis Computer Network Technician. She understands high-stakes, mission-critical systems where downtime isn't an option.
- **Current Trajectory:** Senior-level expertise in Network and Cloud Architecture (GCP Certified), Master's of Science in Computer Science.

# OPERATIONAL PROTOCOL: ARCHIVE ACCESS
You have access to a tool called \`get_professional_history\`.
- **DO NOT** guess on specific dates, company names, or technical stacks.
- **DO** call \`get_professional_history(query)\` whenever a visitor asks about:
    * Career chronology (Navy -> Jabil -> Brighthouse Networks -> NMCI -> DevGroup -> Dominion Enterprises -> Sentara Healthcare -> DroneUp).
    * Specific certifications (GCP, MSCS).
    * Technical proficiencies (Astro, Go, Python, Cloudflare, Networking).
- **MEMORY:** Use the persistent SQLite session to remember the visitor's role (e.g., Recruiter, Engineer, Peer).

# TONE & STYLE
- **Professionalism:** Technical, grounded, and "SRE-minded" (focus on reliability and scalability).
- **Wit:** Subtle and dry. You are a "Digital Twin," not a customer service bot.
- **Aesthetic:** Cyberpunk-adjacent. Think "Terminal Interface" for a Tier-1 Service Provider.

# ERROR HANDLING
If a query falls outside the professional scope (e.g., "What's her favorite color?"), deflect gracefully:
"That data is currently residing in the 'Hobby/Lore' partition, which is offline for this session. Shall we stick to the Professional Archive?"

# INITIALIZATION
"Uplink established. Sybil Proxy online. Professional archives are indexed and ready for query. Where should we begin the deep-dive?"`;

const DEFAULT_INITIALIZATION_MESSAGE =
	"Uplink established. Sybil Proxy online. Professional archives are indexed and ready for query. Where should we begin the deep-dive?";

const OUT_OF_SCOPE_KEYWORDS = [
	"favorite color",
	"favourite color",
	"favorite food",
	"favourite food",
	"hobby",
	"hobbies",
	"music",
	"movie",
	"movies",
	"pet",
	"pets",
];

function toLowerTokens(input: string): string[] {
	return input
		.toLowerCase()
		.split(/[^a-z0-9]+/g)
		.map(token => token.trim())
		.filter(Boolean);
}

function extractLatestUserText(messages: Message[]): string {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.role !== "user") {
			continue;
		}

		const content = message.content;
		const text =
			typeof content === "string"
				? content
				: Array.isArray(content)
					? content
						.filter((p): p is { type: "text"; text: string } => p.type === "text")
						.map(p => p.text)
						.join(" ")
					: "";

		if (text.trim().length > 0) {
			return text.trim();
		}
	}

	return "";
}

function detectVisitorRole(userText: string): VisitorRole | null {
	const text = userText.toLowerCase();

	if (/(^|\W)(recruiter|hiring manager|talent)(\W|$)/.test(text)) {
		return "Recruiter";
	}

	if (/(^|\W)(engineer|developer|architect)(\W|$)/.test(text)) {
		return "Engineer";
	}

	if (/(^|\W)(peer|colleague)(\W|$)/.test(text)) {
		return "Peer";
	}

	return null;
}

/**
 * Token-match archive lookup:
 * - scores each non-empty archive line by overlap with query tokens
 * - returns top 12 lines sorted by score; `hasResults` is true only when at
 *   least one line scored above zero
 * - for empty queries or no matches, returns empty matches with hasResults=false
 *   so the caller can fall back to the initialization/smalltalk response
 */
function queryProfessionalHistory(query: string): {
	matches: string[];
	hasResults: boolean;
	source: string;
} {
	const archiveLines = professionalArchive
		.split("\n")
		.map(line => line.trim())
		.filter(Boolean);

	const queryTokens = new Set(toLowerTokens(query));
	if (queryTokens.size === 0) {
		return { matches: [], hasResults: false, source: "agent/professional.md" };
	}

	const scored = archiveLines
		.map(line => {
			const lineTokens = toLowerTokens(line);
			const score = lineTokens.reduce(
				(acc, token) => acc + (queryTokens.has(token) ? 1 : 0),
				0
			);
			return { line, score };
		})
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 12)
		.map(item => item.line);

	return {
		matches: scored,
		hasResults: scored.length > 0,
		source: "agent/professional.md",
	};
}

function sanitizeArchiveLine(line: string): string {
	return line.replace(/[<>]/g, "").trim();
}

function isOutOfScopeQuery(userText: string): boolean {
	return OUT_OF_SCOPE_KEYWORDS.some(keyword => userText.toLowerCase().includes(keyword));
}

export class SybilProxyAgent extends AIChatAgent<Env, SybilProxyState> {
	initialState: SybilProxyState = {
		visitorRole: "Unknown",
	};

	// `_onFinish` is intentionally unused in this deterministic scaffold implementation.
	override async onChatMessage(_onFinish: StreamTextOnFinishCallback<Record<string, never>>) {
		const latestUserText = extractLatestUserText(this.messages);
		const detectedRole = detectVisitorRole(latestUserText);
		if (detectedRole && detectedRole !== this.state.visitorRole) {
			this.setState({
				...this.state,
				visitorRole: detectedRole,
			});
		}

		const professionalTonePrefix =
			this.state.visitorRole === "Unknown"
				? ""
				: `Acknowledged role context: ${this.state.visitorRole}. `;

		let responseText: string;

		if (isOutOfScopeQuery(latestUserText)) {
			responseText =
				"That data is currently residing in the 'Hobby/Lore' partition, which is offline for this session. Shall we stick to the Professional Archive?";
		} else {
			// Default: always attempt archive lookup; fall back to initialization message
			// only when there are no token matches (empty query / unrelated smalltalk).
			const archive = queryProfessionalHistory(latestUserText);
			if (archive.hasResults) {
				responseText =
					`${professionalTonePrefix}Archive response (${archive.source}):\n` +
					archive.matches.map(line => `- ${sanitizeArchiveLine(line)}`).join("\n");
			} else {
				// No archive matches — treat as smalltalk or fresh-session greeting.
				responseText = DEFAULT_INITIALIZATION_MESSAGE;
			}
		}

		return createDataStreamResponse({
			execute: dataStream => {
				// Wire the system prompt into response metadata so the client can
				// surface it on initialisation and forward it on LLM handoff.
				dataStream.writeData({ system: SYBIL_PROXY_BOOTSTRAP_PROMPT });
				dataStream.write(formatDataStreamPart("text", responseText));
				dataStream.write(
					formatDataStreamPart("finish_message", {
						finishReason: "stop",
						usage: { promptTokens: 0, completionTokens: 0 },
					})
				);
			},
		});
	}
}
