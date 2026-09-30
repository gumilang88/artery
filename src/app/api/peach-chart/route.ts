import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const intervals: Record<string, string> = { "1m": "1min", "5m": "5min", "15m": "15min", "1h": "1h", "4h": "4h", "1d": "1d" };
const cache = new Map<string, { at: number; candles: number[][] }>();
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const interval = request.nextUrl.searchParams.get("interval") || "15m";
  if (!/^0x[a-fA-F0-9]{40}$/.test(token) || !intervals[interval]) return NextResponse.json({ error: "Invalid token or interval" }, { status: 400 });
  const key = `${token.toLowerCase()}:${interval}`, old = cache.get(key);
  if (old && Date.now() - old.at < 30_000) return NextResponse.json({ candles: old.candles, stale: false });
  const now = Date.now();
  const url = new URL("https://api.peach.ag/v1/proxy/coinmarketcap/v1/k-line/candles");
  Object.entries({ platform: "arc", address: token, from: String(now - 30 * 86400_000), to: String(now), interval: intervals[interval], unit: "usd", pm: "p", limit: "300" }).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000), headers: { "Accept-Encoding": "identity" } });
    if (!response.ok) throw Error("Peach chart unavailable");
    const payload = await response.json();
    // Peach format: [open, high, low, close, volume, unix milliseconds, trades].
    const candles = (Array.isArray(payload.data) ? payload.data : []).filter((r: unknown) => Array.isArray(r) && r.length >= 6 && r.slice(0, 6).every((v: unknown) => Number.isFinite(Number(v)))).map((r: number[]) => [Math.floor(Number(r[5]) / 1000), Number(r[0]), Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])]);
    if (candles.length) cache.set(key, { at: Date.now(), candles });
    return NextResponse.json({ candles, stale: false, source: "Peach" });
  } catch { return old ? NextResponse.json({ candles: old.candles, stale: true, source: "Peach" }) : NextResponse.json({ error: "Peach chart unavailable" }, { status: 502 }); }
}
