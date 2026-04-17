import { AIChatAgent } from "@cloudflare/agents/ai-chat-agent";
import {
	createDataStreamResponse,
	type StreamTextOnFinishCallback,
	type UIMessage,
} from "ai";

import professionalArchive from "./professional.md?raw";

type VisitorRole = "Recruiter" | "Engineer" | "Peer" | "Unknown";

type SybilProxyState = {
	visitorRole: VisitorRole;
};

const SYBIL_PROXY_BOOTSTRAP_PROMPT = `# IDENTITY
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
- **MEMORY:** Use the persistent SQLite session to remember the visitor’s role (e.g., Recruiter, Engineer, Peer).

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
const PROFESSIONAL_SCOPE_KEYWORDS = [
	"career",
	"chronology",
	"history",
	"navy",
	"jabil",
	"brighthouse",
	"nmci",
	"devgroup",
	"dominion",
	"sentara",
	"droneup",
	"gcp",
	"mscs",
	"certification",
	"astro",
	"go",
	"python",
	"cloudflare",
	"network",
];
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

function extractLatestUserText(messages: UIMessage[]): string {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.role !== "user") {
			continue;
		}

		const userText = message.parts
			.filter(part => part.type === "text")
			.map(part => part.text)
			.join(" ")
			.trim();

		if (userText.length > 0) {
			return userText;
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
 * Naive token-match archive lookup:
 * - scores each non-empty line by overlap with query tokens
 * - returns top 12 matches by score
 * - falls back to first 12 archive lines for empty/no-match queries
 */
function queryProfessionalHistory(query: string): { matches: string[]; source: string } {
	const archiveLines = professionalArchive
		.split("\n")
		.map(line => line.trim())
		.filter(Boolean);

	const queryTokens = new Set(toLowerTokens(query));
	if (queryTokens.size === 0) {
		return {
			matches: archiveLines.slice(0, 12),
			source: "agent/professional.md",
		};
	}

	const scored = archiveLines
		.map(line => {
			const lineTokens = toLowerTokens(line);
			const score = lineTokens.reduce((acc, token) => acc + (queryTokens.has(token) ? 1 : 0), 0);
			return { line, score };
		})
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 12)
		.map(item => item.line);

	return {
		matches: scored.length > 0 ? scored : archiveLines.slice(0, 12),
		source: "agent/professional.md",
	};
}

function sanitizeArchiveLine(line: string): string {
	return line.replace(/[<>]/g, "").trim();
}

function isProfessionalScopeQuery(userText: string): boolean {
	return PROFESSIONAL_SCOPE_KEYWORDS.some(keyword =>
		userText.toLowerCase().includes(keyword)
	);
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

		const professionalTonePrefix = this.state.visitorRole === "Unknown"
			? ""
			: `Acknowledged role context: ${this.state.visitorRole}. `;

		let responseText = DEFAULT_INITIALIZATION_MESSAGE;
		if (isOutOfScopeQuery(latestUserText)) {
			responseText =
				"That data is currently residing in the 'Hobby/Lore' partition, which is offline for this session. Shall we stick to the Professional Archive?";
		} else if (isProfessionalScopeQuery(latestUserText)) {
			const archive = queryProfessionalHistory(latestUserText);
			responseText = `${professionalTonePrefix}Archive response (${archive.source}):\n${archive.matches.map(line => `- ${sanitizeArchiveLine(line)}`).join("\n")}`;
		} else {
			// Non-professional greeting/smalltalk fallback keeps the bootstrap initialization line.
			responseText = DEFAULT_INITIALIZATION_MESSAGE;
		}

		return createDataStreamResponse({
			execute: dataStream => {
				dataStream.writeData({
					type: "sybil_proxy_response",
					text: responseText,
				});
			},
		});
	}
}
