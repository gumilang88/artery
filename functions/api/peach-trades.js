const cache = new Map();
export async function onRequest({ request }) {
  const headers = { "content-type": "application/json", "access-control-allow-origin": "*" };
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers });
  const key = token.toLowerCase(), old = cache.get(key);
  if (old && Date.now() - old.at < 8000) return new Response(JSON.stringify({ trades: old.trades, stale: false, source: "Peach" }), { headers });
  const url = new URL("https://api.peach.ag/v1/proxy/coinmarketcap/v1/dex/tokens/transactions");
  for (const [k, v] of Object.entries({ platform: "arc", address: token, limit: "50" })) url.searchParams.set(k, v);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { "Accept-Encoding": "identity" } });
    if (!response.ok) throw Error(`Peach trades ${response.status}`);
    const payload = await response.json();
    const raw = payload.data?.swaps;
    const trades = (Array.isArray(raw) ? raw : []).map(s => {
      const is0 = String(s.t0a).toLowerCase() === key;
      const is1 = String(s.t1a).toLowerCase() === key;
      if ((!is0 && !is1) || !/^0x[a-fA-F0-9]{64}$/.test(String(s.tx))) return null;
      const side = String(s.tp).toLowerCase();
      return { tx: s.tx, at: new Date(Number(s.ts)).toISOString(), side: side === "buy" || side === "sell" ? side : "unknown", tokenAmount: is0 ? s.a0 : s.a1, usd: s.v, priceUsd: is0 ? s.t0pu : s.t1pu };
    }).filter(Boolean);
    if (trades.length) cache.set(key, { at: Date.now(), trades });
    return new Response(JSON.stringify({ trades, stale: false, source: "Peach" }), { headers });
  } catch {
    return new Response(JSON.stringify(old ? { trades: old.trades, stale: true, source: "Peach" } : { error: "Peach trades unavailable" }), { status: old ? 200 : 502, headers });
  }
}
