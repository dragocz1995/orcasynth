import { daemonUrl, forwardHeaders, isSameOrigin, clearCookie, COOKIE_NAME } from '../../../lib/proxy';

// Catch-all BFF proxy: every browser REST/SSE call hits this same-origin route, which reads the
// httpOnly session cookie, injects it as a daemon bearer token server-side, and streams the response
// straight back (SSE frames included). The token never reaches browser JS.
type Ctx = { params: Promise<{ path: string[] }> };

function tokenFrom(req: Request): string | null {
  const m = (req.headers.get('cookie') ?? '').match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return m ? m[1] : null;
}

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

async function proxy(req: Request, ctx: Ctx): Promise<Response> {
  if (MUTATING.has(req.method) && !isSameOrigin(req)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } });
  }
  const token = tokenFrom(req);
  if (!token) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const { path } = await ctx.params;
  const search = new URL(req.url).search;
  const headers = forwardHeaders(req);
  headers.set('authorization', `Bearer ${token}`);
  const upstream = await fetch(`${daemonUrl()}/${path.join('/')}${search}`, {
    method: req.method,
    headers,
    body: MUTATING.has(req.method) ? await req.text() : undefined,
  });
  const resHeaders = new Headers(upstream.headers);
  // A daemon 401 means the session token is stale/revoked — expire the cookie so the gate logs out.
  if (upstream.status === 401) resHeaders.append('set-cookie', clearCookie());
  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}

export const GET = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const POST = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const PATCH = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const PUT = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const DELETE = (req: Request, ctx: Ctx) => proxy(req, ctx);
