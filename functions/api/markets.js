// Cloudflare Pages Function — proxy /api/markets (Artery market feed).
// Port of src/app/api/markets/route.ts (Peach + Tolly aggregator).

const json = async (url) => {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "Artery-Market-Reader/1.0" },
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
};

const valid = (v) => typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v);
const positive = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const numeric = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pick = (v) => (typeof v === "string" ? v : "");

const PEACH_URL = (() => {
  const u = new URL("https://api.peach.ag/arc/v1/arc/pro/v2/coin_list");
  Object.entries({ tag: "trending", date_type: "5m", limit: "100", offset: "0", sort_field: "rank", desc: "false" }).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
})();

let cache = null; // { at, payload } — in-memory per-isolate, best effort

export async function onRequest(context) {
  const { request } = context;
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    if (cache && Date.now() - cache.at < 15000) {
      return new Response(JSON.stringify(cache.payload), { headers: { ...cors, "content-type": "application/json", "cache-control": "public, max-age=0, s-maxage=15" } });
    }

    const [peach, tolly] = await Promise.allSettled([
      json(PEACH_URL),
      json("https://api.tollylabs.com/tokens?limit=200&sort=volume24h"),
    ]);

    const map = new Map();

    // Secondary sources
    for (const payload of [tolly.status === "fulfilled" ? tolly.value : null]) {
      if (!payload) continue;
      const rows = Array.isArray(payload?.tokens) ? payload.tokens : Array.isArray(payload?.data?.tokens) ? payload.data.tokens : Array.isArray(payload?.data) ? payload.data : [];
      for (const row of rows) {
        if (!valid(row.address) || (row.chainId != null && Number(row.chainId) !== 5042)) continue;
        const volume = positive(row.volume24h ?? row.v24h);
        if (volume < 1000) continue;
        const key = row.address.toLowerCase();
        if (!map.has(key)) map.set(key, {
          address: row.address, chainId: 5042, symbol: pick(row.symbol), name: pick(row.name),
          logoURI: pick(row.image_uri ?? row.logoURI), p: String(positive(row.price ?? row.p)),
          mcap: String(positive(row.marketCap ?? row.mcap)), liqUsd: String(positive(row.liquidity ?? row.liqUsd)),
          v24h: String(volume), ch24h: String(numeric(row.change24h) / 100),
        });
      }
    }

    // Primary source (Peach)
    const peachData = peach.status === "fulfilled" ? peach.value : null;
    const peachRows = Array.isArray(peachData?.data?.coin_list) ? peachData.data.coin_list : [];
    for (const row of peachRows) {
      if (!valid(row.address) || Number(row.chainId) !== 5042) continue;
      const volume = positive(row.v24h);
      if (volume < 1000) continue;
      map.set(row.address.toLowerCase(), {
        address: row.address, chainId: 5042, symbol: pick(row.symbol), name: pick(row.name),
        logoURI: pick(row.logoURI), p: String(positive(row.p)), mcap: String(positive(row.mcap)),
        liqUsd: String(positive(row.liqUsd)), v24h: String(volume), ch24h: String(numeric(row.ch24h)),
        states: Array.isArray(row.states) ? row.states : [],
      });
    }

    const sourceStatus = { peach: peach.status === "fulfilled", tolly: tolly.status === "fulfilled" };
    if (!Object.values(sourceStatus).some(Boolean)) {
      return new Response(JSON.stringify({ error: "All market sources unavailable" }), { status: 502, headers: { ...cors, "content-type": "application/json" } });
    }

    const tokens = [...map.values()].filter((t) => t.symbol && positive(t.v24h) >= 1000).sort((a, b) => positive(b.v24h) - positive(a.v24h));
    const payload = { tokens, receivedAt: Date.now(), sources: sourceStatus, partial: Object.values(sourceStatus).some((x) => !x), universe: "High-volume candidates from available ARC feeds", minimumVolumeUSD: 1000 };

    cache = { at: Date.now(), payload };
    return new Response(JSON.stringify(payload), { headers: { ...cors, "content-type": "application/json", "cache-control": "public, max-age=0, s-maxage=15" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "upstream error" }), { status: 502, headers: { ...cors, "content-type": "application/json" } });
  }
}
