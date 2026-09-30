import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const cache = new Map<string, { at: number; trades: unknown[] }>();

export async function GET(request: NextRequest) {
  const pool = request.nextUrl.searchParams.get("pool") || "";
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!/^0x(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(pool) || !addressPattern.test(token)) return NextResponse.json({ error: "Invalid pool or token" }, { status: 400 });
  const key = `${pool.toLowerCase()}:${token.toLowerCase()}`;
  const previous = cache.get(key);
  if (previous && Date.now() - previous.at < 15_000) return NextResponse.json({ trades: previous.trades, stale: false });
  try {
    const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/arc/pools/${pool}/trades`, { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return previous ? NextResponse.json({ trades: previous.trades, stale: true }) : NextResponse.json({ error: "GeckoTerminal trades unavailable" }, { status: 502 });
    const payload = await response.json();
    const trades = (Array.isArray(payload.data) ? payload.data : []).map((entry: { attributes?: Record<string, string> }) => {
      const a = entry.attributes || {};
      const buy = a.to_token_address?.toLowerCase() === token.toLowerCase();
      const sell = a.from_token_address?.toLowerCase() === token.toLowerCase();
      if (!buy && !sell) return null;
      return { tx: a.tx_hash, at: a.block_timestamp, side: buy ? "buy" : "sell", tokenAmount: buy ? a.to_token_amount : a.from_token_amount, usd: a.volume_in_usd, priceUsd: buy ? a.price_to_in_usd : a.price_from_in_usd };
    }).filter(Boolean);
    cache.set(key, { at: Date.now(), trades });
    return NextResponse.json({ trades, stale: false }, { headers: { "Cache-Control": "no-store" } });
  } catch { return previous ? NextResponse.json({ trades: previous.trades, stale: true }) : NextResponse.json({ error: "GeckoTerminal trades unavailable" }, { status: 502 }); }
}
