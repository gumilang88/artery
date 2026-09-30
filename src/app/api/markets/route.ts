import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
type Raw = Record<string, unknown>;
type Token = { address: string; chainId: number; symbol: string; name: string; logoURI?: string; p: string; mcap: string; liqUsd: string; v24h: string; ch24h: string; states?: Raw[] };
const valid = (value: unknown): value is string => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
const positive = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; };
const numeric = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const pick = (value: unknown) => typeof value === "string" ? value : "";
async function json(url: string) {
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9500), headers: { accept: "application/json", "user-agent": "Artery-Market-Reader/1.0" } });
  if (!r.ok) throw Error(`upstream ${r.status}`);
  return r.json();
}
const peachURL = (() => { const u = new URL("https://api.peach.ag/arc/v1/arc/pro/v2/coin_list");
  Object.entries({ tag: "trending", date_type: "5m", limit: "100", offset: "0", sort_field: "rank", desc: "false" }).forEach(([k,v]) => u.searchParams.set(k,v)); return u.toString(); })();
let cache: { at: number; payload: unknown } | null = null;
export async function GET() {
  if (cache && Date.now() - cache.at < 15000) return NextResponse.json(cache.payload);
  const sources = await Promise.allSettled([json(peachURL), json("https://api.tollylabs.com/tokens?limit=200&sort=volume24h")]);
  const [peach, tolly] = sources.map(x => x.status === "fulfilled" ? x.value : null);
  const sourceStatus = { peach: !!peach, tolly: !!tolly };
  const map = new Map<string, Token>();
  // Secondary sources discover additional contracts. Never add volume from different feeds together.
  for (const payload of [tolly]) {
    const rows = Array.isArray(payload?.tokens) ? payload.tokens : Array.isArray(payload?.data?.tokens) ? payload.data.tokens : Array.isArray(payload?.data) ? payload.data : [];
    for (const row of rows as Raw[]) {
      if (!valid(row.address) || (row.chainId != null && Number(row.chainId) !== 5042)) continue;
      const volume = positive(row.volume24h ?? row.v24h);
      if (volume < 1000) continue;
      const key = row.address.toLowerCase();
      if (!map.has(key)) map.set(key, { address: row.address, chainId: 5042, symbol: pick(row.symbol), name: pick(row.name), logoURI: pick(row.image_uri ?? row.logoURI), p: String(positive(row.price ?? row.p)), mcap: String(positive(row.marketCap ?? row.mcap)), liqUsd: String(positive(row.liquidity ?? row.liqUsd)), v24h: String(volume), ch24h: String(numeric(row.change24h) / 100) });
    }
  }
  const peachRows = Array.isArray(peach?.data?.coin_list) ? peach.data.coin_list as Raw[] : [];
  for (const row of peachRows) {
    if (!valid(row.address) || Number(row.chainId) !== 5042) continue;
    const volume = positive(row.v24h);
    if (volume < 1000) continue;
    map.set(row.address.toLowerCase(), { address: row.address, chainId: 5042, symbol: pick(row.symbol), name: pick(row.name), logoURI: pick(row.logoURI), p: String(positive(row.p)), mcap: String(positive(row.mcap)), liqUsd: String(positive(row.liqUsd)), v24h: String(volume), ch24h: String(numeric(row.ch24h)), states: Array.isArray(row.states) ? row.states as Raw[] : [] });
  }
  if (!Object.values(sourceStatus).some(Boolean)) return NextResponse.json({ error: "All market sources unavailable" }, { status: 502 });
  const tokens = [...map.values()].filter(t => t.symbol && positive(t.v24h) >= 1000).sort((a,b) => positive(b.v24h) - positive(a.v24h));
  const payload = { tokens, receivedAt: Date.now(), sources: sourceStatus, partial: Object.values(sourceStatus).some(x => !x), universe: "High-volume candidates from available ARC feeds", minimumVolumeUSD: 1000 };
  cache = { at: Date.now(), payload };
  return NextResponse.json(payload, { headers: { "Cache-Control": "public, max-age=0, s-maxage=15" } });
}
