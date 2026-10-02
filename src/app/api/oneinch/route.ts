import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 1inch anonymous JWT proxy — avoids CORS + keeps token server-side.
// Endpoints under proxy-app.1inch.com accept an anonymous Bearer token
// obtained from /v2.0/auth/token (GET, no body, no signup).

const BASE = "https://proxy-app.1inch.com";
const ARC = "5042";

type TokenCache = { token: string; exp: number } | null;
let cache: TokenCache = null;

async function anonToken(): Promise<string> {
  if (cache && cache.exp > Date.now() + 60_000) return cache.token;
  const r = await fetch(`${BASE}/v2.0/auth/token`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`auth ${r.status}`);
  const data = (await r.json()) as { access_token?: string; exp?: number };
  if (!data.access_token) throw new Error("no access_token");
  const exp = data.exp ? data.exp * 1000 : Date.now() + 300_000;
  cache = { token: data.access_token, exp };
  return data.access_token;
}

// Whitelist of allowed sub-paths (never forward arbitrary user input to upstream).
const ALLOWED: Record<string, string> = {
  swap: "/v2.0/swap/v6.1",
  orderbook: "/v2.0/orderbook/v4.0",
  token: "/v2.0/token/v1.7",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seg = url.searchParams.get("path") || "";
  const service = url.searchParams.get("svc") || "swap";

  const basePath = ALLOWED[service];
  if (!basePath) return NextResponse.json({ error: "unknown service" }, { status: 400 });

  // Reconstruct upstream path from the whitelisted segment + provided sub-path.
  const sub = seg.startsWith("/") ? seg : `/${seg}`;
  const upstream = new URL(`${BASE}${basePath}/${ARC}${sub}`);

  // Copy through query params (drop our control params).
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "path" || k === "svc") continue;
    upstream.searchParams.set(k, v);
  }

  try {
    const token = await anonToken();
    const r = await fetch(upstream.toString(), {
      cache: "no-store",
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    });
    const text = await r.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }
    return NextResponse.json(body, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upstream error" },
      { status: 502 }
    );
  }
}

// POST needed for building signed order submissions later (swap/approve not needed server-side;
// limit order build happens client-side with wallet signing).
export async function POST(request: Request) {
  const url = new URL(request.url);
  const seg = url.searchParams.get("path") || "";
  const service = url.searchParams.get("svc") || "orderbook";
  const basePath = ALLOWED[service];
  if (!basePath) return NextResponse.json({ error: "unknown service" }, { status: 400 });
  const sub = seg.startsWith("/") ? seg : `/${seg}`;
  const upstream = new URL(`${BASE}${basePath}/${ARC}${sub}`);
  try {
    const token = await anonToken();
    const bodyText = await request.text();
    const r = await fetch(upstream.toString(), {
      method: "POST",
      cache: "no-store",
      headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
      body: bodyText || undefined,
      signal: AbortSignal.timeout(15000),
    });
    const text = await r.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }
    return NextResponse.json(body, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upstream error" },
      { status: 502 }
    );
  }
}
