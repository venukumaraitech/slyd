import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createSlydServer } from "@/lib/mcp/server";
import { siteMovedTo } from "@/lib/site";

/**
 * Remote MCP endpoint: https://tryslyd.vercel.app/mcp (Streamable HTTP, stateless).
 * No auth, no storage: every tool is a pure function of its input, so each
 * request gets a fresh server and nothing is kept between calls.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

const withCors = (res: Response) => {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
};

/**
 * The address people reach this server at: PUBLIC_URL if set, else the request's own
 * host (behind a proxy, X-Forwarded-*). Self-hosted copies then link to themselves.
 */
function publicOrigin(req: Request) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  // The website moved (tryslyd.vercel.app → GitHub Pages): carousel links open there.
  const moved = siteMovedTo();
  if (moved) return moved;
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host") || url.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

async function handle(req: Request) {
  const server = createSlydServer(publicOrigin(req));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(req));
  } finally {
    // Stateless: release per-request resources once the response is produced.
    queueMicrotask(() => void server.close().catch(() => {}));
  }
}

/**
 * Stateless server: there is no server-to-client stream and no session to end. The MCP spec
 * says to answer GET/DELETE with 405 then. (Answering GET with an SSE stream that closes at
 * once made clients reconnect in a loop: millions of function invocations for nothing.)
 */
function notAllowed(req: Request) {
  if (req.method === "GET" && (req.headers.get("accept") ?? "").includes("text/html")) {
    return Response.redirect(new URL("/agents", req.url), 302);
  }
  return withCors(new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed: this server is stateless; use POST." }, id: null }), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: "POST, OPTIONS" },
  }));
}

export const GET = notAllowed;
export const POST = handle;
export const DELETE = notAllowed;
export function OPTIONS() {
  // Browsers may reuse this preflight answer for a day instead of asking before every call.
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
