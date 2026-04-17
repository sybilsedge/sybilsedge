import type { APIRoute } from "astro";
import { routeAgentRequest } from "@cloudflare/agents";
import { env } from "cloudflare:workers";

export { SybilProxyAgent } from "../../../../agent/sybil-proxy";

function toAgentRoutableRequest(request: Request): Request {
	const url = new URL(request.url);
	const normalizedPath = url.pathname.replace(/\/+$/, "");

	if (normalizedPath === "/api/agent") {
		url.pathname = "/api/agent/sybil-proxy-agent/default";
	}

	return new Request(url, request);
}

export const ALL: APIRoute = async ({ request }) => {
	if (!env.SybilProxyAgent) {
		return new Response(
			"SybilProxyAgent Durable Object binding is not configured yet. Add the binding and migration in wrangler.jsonc to enable /api/agent WebSocket routing.",
			{ status: 503 }
		);
	}

	const routableRequest = toAgentRoutableRequest(request);
	const response = await routeAgentRequest(routableRequest, env, {
		prefix: "api/agent",
	});

	return response ?? new Response("Not Found", { status: 404 });
};
