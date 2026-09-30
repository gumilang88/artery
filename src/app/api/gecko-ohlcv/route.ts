import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const addressPattern = /^0x(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/;
const intervals: Record<string, [string, number]> = { "1m": ["minute", 1], "5m": ["minute", 5], "15m": ["minute", 15], "1h": ["hour", 1], "4h": ["hour", 4], "1d": ["day", 1] };
const cache = new Map<string, { at: number; candles: number[][] }>();
export async function GET(request: NextRequest) {
  const pool = request.nextUrl.searchParams.get("pool") || "";
  const interval = request.nextUrl.searchParams.get("interval") || "15m";
  if (!addressPattern.test(pool) || !intervals[interval]) return NextResponse.json({ error: "Invalid pool or interval" }, { status: 400 });
  const key = `${pool.toLowerCase()}:${interval}`;
  const previous = cache.get(key);
  if (previous && Date.now() - previous.at < 60_000) return NextResponse.json({ candles: previous.candles, stale: false });
  const [unit, aggregate] = intervals[interval];
  try {
    const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/arc/pools/${pool}/ohlcv/${unit}?aggregate=${aggregate}&limit=150`, { cache: "no-store", signal: AbortSignal.timeout(10000), headers: { accept: "application/json" } });
    if (!response.ok) return previous ? NextResponse.json({ candles: previous.candles, stale: true }) : NextResponse.json({ error: "GeckoTerminal OHLCV unavailable" }, { status: 502 });
    const payload = await response.json();
    const candles = payload?.data?.attributes?.ohlcv_list;
    if (Array.isArray(candles)) cache.set(key, { at: Date.now(), candles });
    return NextResponse.json({ candles: Array.isArray(candles) ? candles : [], stale: false }, { headers: { "Cache-Control": "no-store" } });
  } catch { return previous ? NextResponse.json({ candles: previous.candles, stale: true }) : NextResponse.json({ error: "GeckoTerminal OHLCV unavailable" }, { status: 502 }); }
}
