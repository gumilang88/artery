// Cloudflare Pages Function — /api/oneinch?svc=&path=  (1inch anonymous JWT proxy)
const BASE = "https://proxy-app.1inch.com";
const ARC = "5042";

let cache = null; // { token, exp }

async function anonToken() {
  if (cache && cache.exp > Date.now() + 60000) return cache.token;
  const r = await fetch(`${BASE}/v2.0/auth/token`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`auth ${r.status}`);
  const data = await r.json();
  if (!data.access_token) throw new Error("no access_token");
  const exp = data.exp ? data.exp * 1000 : Date.now() + 300000;
  cache = { token: data.access_token, exp };
  return data.access_token;
}

const ALLOWED = { swap: "/v2.0/swap/v6.1", orderbook: "/v2.0/orderbook/v4.0", token: "/v2.0/token/v1.7" };

async function handle(request, cors) {
  const url = new URL(request.url);
  const seg = url.searchParams.get("path") || "";
  const service = url.searchParams.get("svc") || "swap";
  const basePath = ALLOWED[service];
  if (!basePath) return new Response(JSON.stringify({ error: "unknown service" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });

  const sub = seg.startsWith("/") ? seg : `/${seg}`;
  const upstream = new URL(`${BASE}${basePath}/${ARC}${sub}`);
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "path" || k === "svc") continue;
    upstream.searchParams.set(k, v);
  }

  try {
    const token = await anonToken();
    const isPost = request.method === "POST";
    const bodyText = isPost ? await request.text() : undefined;
    const r = await fetch(upstream.toString(), {
      method: request.method,
      headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
      body: bodyText || undefined,
      signal: AbortSignal.timeout(15000),
    });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return new Response(JSON.stringify(body), { status: r.status, headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "upstream error" }), { status: 502, headers: { ...cors, "content-type": "application/json" } });
  }
}

export async function onRequest(context) {
  const { request } = context;
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  return handle(request, cors);
}
