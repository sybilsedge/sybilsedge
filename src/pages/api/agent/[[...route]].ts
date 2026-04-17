import type { APIRoute } from "astro";
import { routeAgentRequest } from "agents";
import { env } from "cloudflare:workers";

export { SybilProxyAgent } from "../../../../agent/sybil-proxy";

function toAgentRoutableRequest(request: Request): Request {
	const url = new URL(request.url);
	const normalizedPath = url.pathname.replace(/\/+$/, "");

	// Support a direct websocket endpoint at /api/agent by routing it
	// to a default SybilProxyAgent instance name.
	if (normalizedPath === "/api/agent") {
		url.pathname = "/api/agent/sybil-proxy-agent/default";
	}

	return new Request(url, request);
}

export const ALL: APIRoute = async ({ request }) => {
	const routableRequest = toAgentRoutableRequest(request);
	const response = await routeAgentRequest(routableRequest, env, {
		prefix: "api/agent",
	});

	return response ?? new Response("Not Found", { status: 404 });
};
