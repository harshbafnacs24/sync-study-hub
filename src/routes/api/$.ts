import { createFileRoute } from "@tanstack/react-router";
import { BACKEND_URL } from "../../lib/api-client";

async function handleProxy(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Exclude /api/sage from wildcard proxying (sage.ts handles it)
  if (url.pathname === "/api/sage") {
    return new Response("Not found", { status: 404 });
  }

  // Construct target URL using the server-side BACKEND_URL
  const targetUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  // Check for WebSocket upgrade request
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader?.toLowerCase() === "websocket") {
    try {
      console.log(`[Proxy WS] Forwarding socket connection to: ${targetUrl}`);
      return await fetch(targetUrl, {
        headers: request.headers,
      });
    } catch (err: any) {
      console.error(`[WebSocket Proxy Error] Failed to proxy WS connection to ${targetUrl}:`, err);
      return new Response("WebSocket proxy failed", { status: 502 });
    }
  }

  // For regular HTTP requests, construct standard request forwarding options
  const headers = new Headers(request.headers);

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    return await fetch(targetUrl, init);
  } catch (error: any) {
    console.error(`[API Proxy Error] Failed to proxy ${url.pathname} to ${targetUrl}:`, error);
    return new Response(
      JSON.stringify({ error: `Failed to reach backend: ${error.message}` }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleProxy(request),
      POST: ({ request }) => handleProxy(request),
      PUT: ({ request }) => handleProxy(request),
      PATCH: ({ request }) => handleProxy(request),
      DELETE: ({ request }) => handleProxy(request),
      OPTIONS: ({ request }) => handleProxy(request),
    },
  },
});
