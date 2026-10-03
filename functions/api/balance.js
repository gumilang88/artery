// Cloudflare Pages Function — /api/balance?token=&owner=&spender=
const ARC_RPC = "https://rpc.mainnet.arc.io";

async function ethCall(to, data) {
  const r = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to, data }, "latest"], id: 1 }),
  });
  const json = await r.json();
  if (json.error || !json.result) return null;
  return json.result;
}

const BAL = "0x70a08231", DEC = "0x313ce567", ALLOW = "0xdd62ed3e";

export async function onRequest(context) {
  const { request } = context;
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const owner = url.searchParams.get("owner") || "";
  const spender = url.searchParams.get("spender") || "";

  if (!/^0x[0-9a-fA-F]{40}$/.test(token) || !/^0x[0-9a-fA-F]{40}$/.test(owner)) {
    return new Response(JSON.stringify({ error: "invalid params" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }

  const balHex = await ethCall(token, BAL + owner.slice(2).padStart(64, "0"));
  if (balHex === null) {
    return new Response(JSON.stringify({ error: "balance fetch failed" }), { status: 502, headers: { ...cors, "content-type": "application/json" } });
  }
  const balance = BigInt(balHex).toString();

  let allowance = null;
  if (/^0x[0-9a-fA-F]{40}$/.test(spender)) {
    const allowHex = await ethCall(token, ALLOW + owner.slice(2).padStart(64, "0") + spender.slice(2).padStart(64, "0"));
    if (allowHex !== null) allowance = BigInt(allowHex).toString();
  }

  const decHex = await ethCall(token, DEC);
  const decimals = decHex ? parseInt(decHex, 16) || 18 : 18;

  return new Response(JSON.stringify({ balance, decimals, allowance }), { headers: { ...cors, "content-type": "application/json" } });
}
