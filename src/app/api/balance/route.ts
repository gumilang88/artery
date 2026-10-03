import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Balance + decimals proxy — reads ARC via public RPC (no wallet dependency).
// GET /api/balance/?token=<addr>&owner=<addr>

const ARC_RPC = "https://rpc.mainnet.arc.io";

async function ethCall(to: string, data: string): Promise<string | null> {
  const r = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = (await r.json()) as { result?: string; error?: { message?: string } };
  if (json.error || !json.result) return null;
  return json.result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const owner = url.searchParams.get("owner") || "";
  const spender = url.searchParams.get("spender") || "";

  if (!token || !owner || !/^0x[0-9a-fA-F]{40}$/.test(token) || !/^0x[0-9a-fA-F]{40}$/.test(owner)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const BAL_SIG = "0x70a08231"; // balanceOf(address) — 4-byte selector
  const DEC_SIG = "0x313ce567"; // decimals() — 4-byte selector

  const balHex = await ethCall(token, BAL_SIG + owner.slice(2).padStart(64, "0"));
  if (balHex === null) {
    return NextResponse.json({ error: "balance fetch failed" }, { status: 502 });
  }

  const balance = BigInt(balHex).toString();

  // Optional: allowance query when spender provided
  let allowance: string | null = null;
  if (spender && /^0x[0-9a-fA-F]{40}$/.test(spender)) {
    const ALLOW_SIG = "0xdd62ed3e"; // allowance(owner,spender)
    const allowHex = await ethCall(token, ALLOW_SIG + owner.slice(2).padStart(64, "0") + spender.slice(2).padStart(64, "0"));
    if (allowHex !== null) allowance = BigInt(allowHex).toString();
  }

  const decHex = await ethCall(token, DEC_SIG);
  const decimals = decHex ? parseInt(decHex, 16) || 18 : 18;

  return NextResponse.json({ balance, decimals, allowance });
}
