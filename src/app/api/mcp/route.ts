import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { bearer } from '@/lib/keys';
import { buildMcpServer } from '@/lib/mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-expose-headers': 'mcp-session-id',
};

/** Remote MCP endpoint (Streamable HTTP, stateless). Connect with just the URL. */
async function handle(req: Request) {
  const server = buildMcpServer(bearer(req));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
export const OPTIONS = () => new Response(null, { status: 204, headers: cors });
