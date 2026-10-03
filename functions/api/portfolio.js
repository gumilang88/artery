// Cloudflare Pages Function — /api/portfolio?owner=  (scan wallet across ARC feed)
const ARC_RPC = "https://rpc.mainnet.arc.io";
const BAL = "0x70a08231", DEC = "0x313ce567";

async function ethCall(to, data) {
  for (let a = 0; a < 2; a++) {
    try {
      const r = await fetch(ARC_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to, data }, "latest"], id: 1 }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await r.json();
      if (json.error || !json.result) return null;
      return json.result;
    } catch { if (a === 1) return null; }
  }
  return null;
}

export async function onRequest(context) {
  const { request, env } = context;
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const owner = new URL(request.url).searchParams.get("owner") || "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) {
    return new Response(JSON.stringify({ error: "invalid owner" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }

  // Pull token list from our own markets function
  let tokens = [];
  try {
    const base = new URL(request.url).origin;
    const m = await fetch(`${base}/api/markets`, { headers: { accept: "application/json" } });
    const data = await m.json();
    tokens = Array.isArray(data.tokens) ? data.tokens : [];
  } catch { return new Response(JSON.stringify({ error: "market feed unavailable" }), { status: 502, headers: { ...cors, "content-type": "application/json" } }); }

  const holdings = [];
  const CONCURRENCY = 8;
  const queue = [...tokens];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const t = queue.shift();
      const balHex = await ethCall(t.address, BAL + owner.slice(2).padStart(64, "0"));
      if (!balHex || BigInt(balHex) === BigInt(0)) continue;
      const decHex = await ethCall(t.address, DEC);
      const decimals = decHex ? parseInt(decHex, 16) || 18 : 18;
      const balance = BigInt(balHex).toString();
      const human = Number(balance) / Math.pow(10, decimals);
      const price = Number(t.p) || 0;
      holdings.push({ token: t, balance, decimals, valueUsd: human * price });
    }
  });
  await Promise.all(workers);

  holdings.sort((a, b) => b.valueUsd - a.valueUsd);
  const totalUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);

  return new Response(JSON.stringify({ owner, totalUsd, count: holdings.length, holdings, scanned: tokens.length }), { headers: { ...cors, "content-type": "application/json" } });
}
