import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const cache = new Map<string, { at: number; trades: unknown[] }>();
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const key = token.toLowerCase(), old = cache.get(key);
  if (old && Date.now() - old.at < 8_000) return NextResponse.json({ trades: old.trades, stale: false });
  const url = new URL("https://api.peach.ag/v1/proxy/coinmarketcap/v1/dex/tokens/transactions");
  Object.entries({ platform: "arc", address: token, limit: "50" }).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000), headers: { "Accept-Encoding": "identity" } });
    if (!response.ok) throw Error("Peach trades unavailable");
    const payload = await response.json();
    const raw = payload.data?.swaps;
    const trades = (Array.isArray(raw) ? raw : []).map((s: Record<string, unknown>) => {
      const is0 = String(s.t0a).toLowerCase() === key;
      const is1 = String(s.t1a).toLowerCase() === key;
      if (!is0 && !is1 || !/^0x[a-fA-F0-9]{64}$/.test(String(s.tx))) return null;
      const side = String(s.tp).toLowerCase();
      return { tx: s.tx, at: new Date(Number(s.ts)).toISOString(), side: side === "buy" || side === "sell" ? side : "unknown", tokenAmount: is0 ? s.a0 : s.a1, usd: s.v, priceUsd: is0 ? s.t0pu : s.t1pu };
    }).filter(Boolean);
    if (trades.length) cache.set(key, { at: Date.now(), trades });
    return NextResponse.json({ trades, stale: false, source: "Peach" });
  } catch { return old ? NextResponse.json({ trades: old.trades, stale: true, source: "Peach" }) : NextResponse.json({ error: "Peach trades unavailable" }, { status: 502 }); }
}
