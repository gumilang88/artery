import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const poolPattern = /^0x(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/;

type Pool = { attributes?: { address?: string; name?: string; reserve_in_usd?: string; volume_usd?: { h24?: string } }; relationships?: { base_token?: { data?: { id?: string } }; quote_token?: { data?: { id?: string } } } };
type DexPair = { pairAddress?: string; baseToken?: { address?: string; symbol?: string }; quoteToken?: { address?: string; symbol?: string }; liquidity?: { usd?: number } };
const cache = new Map<string, { at: number; result: { pool: string | null; name: string | null; liquidityUsd: string | null; network: string } }>();
async function dexFallback(token: string) {
  const response = await fetch(`https://api.dexscreener.com/token-pairs/v1/arc/${token}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error("Pool lookup unavailable");
  const payload: DexPair[] = await response.json();
  const pairs = (Array.isArray(payload) ? payload : []).filter(p =>
    poolPattern.test(p.pairAddress || "") &&
    [p.baseToken?.address, p.quoteToken?.address].some(a => a?.toLowerCase() === token.toLowerCase()) &&
    /^0x[a-fA-F0-9]{40}$/.test(p.baseToken?.address || "") && /^0x[a-fA-F0-9]{40}$/.test(p.quoteToken?.address || "")
  ).sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0));
  const best = pairs[0];
  return { pool: best?.pairAddress?.toLowerCase() || null, name: best ? `${best.baseToken?.symbol} / ${best.quoteToken?.symbol}` : null, liquidityUsd: best?.liquidity?.usd?.toString() || null, network: "arc" };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!addressPattern.test(token)) return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
  const key = token.toLowerCase();
  const previous = cache.get(key);
  if (previous && Date.now() - previous.at < 120_000) return NextResponse.json(previous.result);
  try {
    const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/arc/tokens/${token}/pools?page=1`, { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error("GeckoTerminal pool lookup unavailable");
    const data = await response.json();
    const pools: Pool[] = Array.isArray(data.data) ? data.data : [];
    const targetId = `arc_${token.toLowerCase()}`;
    const valid = pools.filter(p => poolPattern.test(p.attributes?.address || "") && [p.relationships?.base_token?.data?.id, p.relationships?.quote_token?.data?.id].some(id => id?.toLowerCase() === targetId));
    const score = (p: Pool) => Number(p.attributes?.reserve_in_usd || 0);
    const pool = valid.sort((a, b) => score(b) - score(a))[0];
    const result = pool ? { pool: pool.attributes?.address || null, name: pool.attributes?.name || null, liquidityUsd: pool.attributes?.reserve_in_usd || null, network: "arc" } : await dexFallback(token);
    if (result.pool) cache.set(key, { at: Date.now(), result });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    if (previous) return NextResponse.json(previous.result);
    try { const result = await dexFallback(token); if (result.pool) cache.set(key, { at: Date.now(), result }); return NextResponse.json(result); }
    catch { return NextResponse.json({ error: "Pool lookup unavailable" }, { status: 502 }); }
  }
}
