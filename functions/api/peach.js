const URL_BASE = "https://api.peach.ag/arc/v1/arc/pro/v2/coin_list";
export async function onRequest({ request }) {
  const cors = { "access-control-allow-origin": "*", "content-type": "application/json", "cache-control": "no-store" };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    const u = new URL(URL_BASE);
    for (const [k, v] of Object.entries({ tag: "trending", date_type: "24h", limit: "100", offset: "0", sort_field: "rank", desc: "false" })) u.searchParams.set(k, v);
    const r = await fetch(u, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return new Response(JSON.stringify({ error: `Peach upstream ${r.status}` }), { status: 502, headers: cors });
    const p = await r.json();
    if (p?.code !== 0 || !Array.isArray(p?.data?.coin_list)) throw Error("invalid feed");
    const tokens = p.data.coin_list.filter((x) => Number(x.chainId) === 5042 && /^0x[a-fA-F0-9]{40}$/.test(x.address || ""));
    return new Response(JSON.stringify({ tokens, receivedAt: Date.now() }), { headers: cors });
  } catch { return new Response(JSON.stringify({ error: "Peach feed unavailable" }), { status: 502, headers: cors }); }
}
