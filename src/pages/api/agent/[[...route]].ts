import type { APIRoute } from "astro";
import { routeAgentRequest } from "agents-sdk";
import { env } from "cloudflare:workers";

export { SybilProxyAgent } from "../../../../agent/sybil-proxy";

/**
 * Normalises the request URL before handing it to routeAgentRequest:
 * 1. Always strips trailing slashes so downstream path matching is canonical.
 * 2. Rewrites the bare /api/agent path to the default agent instance so
 *    direct WebSocket upgrades to /api/agent also resolve correctly.
 */
function toAgentRoutableRequest(request: Request): Request {
	const url = new URL(request.url);
	// Step 1 — strip trailing slashes (applies to all paths, including nested ones).
	url.pathname = url.pathname.replace(/\/+$/, "");

	// Step 2 — rewrite /api/agent → default agent instance path.
	if (url.pathname === "/api/agent") {
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
