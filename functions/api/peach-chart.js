const intervals = { "1m": "1min", "5m": "5min", "15m": "15min", "1h": "1h", "4h": "4h", "1d": "1d" };
const cache = new Map();
export async function onRequest({ request }) {
  const cors = { "access-control-allow-origin": "*", "content-type": "application/json" };
  const q = new URL(request.url).searchParams, token = q.get("token") || "", interval = q.get("interval") || "15m";
  if (!/^0x[a-fA-F0-9]{40}$/.test(token) || !intervals[interval]) return new Response(JSON.stringify({ error: "Invalid token or interval" }), { status: 400, headers: cors });
  const key = `${token.toLowerCase()}:${interval}`, old = cache.get(key);
  if (old && Date.now() - old.at < 30000) return new Response(JSON.stringify({ candles: old.candles, stale: false }), { headers: cors });
  const now = Date.now(), u = new URL("https://api.peach.ag/v1/proxy/coinmarketcap/v1/k-line/candles");
  for (const [k, v] of Object.entries({ platform: "arc", address: token, from: String(now - 30 * 86400000), to: String(now), interval: intervals[interval], unit: "usd", pm: "p", limit: "300" })) u.searchParams.set(k, v);
  try {
    const r = await fetch(u, { headers: { "accept-encoding": "identity" }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw Error();
    const p = await r.json();
    const candles = (Array.isArray(p.data) ? p.data : []).filter((x) => Array.isArray(x) && x.length >= 6 && x.slice(0, 6).every((v) => Number.isFinite(Number(v)))).map((x) => [Math.floor(Number(x[5]) / 1000), Number(x[0]), Number(x[1]), Number(x[2]), Number(x[3]), Number(x[4])]);
    if (candles.length) cache.set(key, { at: Date.now(), candles });
    return new Response(JSON.stringify({ candles, stale: false, source: "Peach" }), { headers: cors });
  } catch { return new Response(JSON.stringify(old ? { candles: old.candles, stale: true, source: "Peach" } : { error: "Peach chart unavailable" }), { status: old ? 200 : 502, headers: cors }); }
}
