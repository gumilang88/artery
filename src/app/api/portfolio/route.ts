import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Portfolio scanner — checks a wallet's balance across every ARC token in the feed.
// GET /api/portfolio/?owner=<addr>
//
// 1. Pull token list from /api/markets (Peach + Tolly feed)
// 2. For each token, read balanceOf(owner) + decimals via ARC RPC (batched)
// 3. Value = balance * price. Return only non-zero holdings + totals.

const ARC_RPC = "https://rpc.mainnet.arc.io";

async function ethCall(to: string, data: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(ARC_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to, data }, "latest"], id: 1 }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const json = (await r.json()) as { result?: string; error?: { message?: string } };
      if (json.error || !json.result) return null;
      return json.result;
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

const BAL_SIG = "0x70a08231"; // balanceOf(address)
const DEC_SIG = "0x313ce567"; // decimals()

type Token = { address: string; symbol: string; name: string; logoURI?: string; p: string; mcap: string; liqUsd: string; v24h: string; ch24h: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner") || "";

  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) {
    return NextResponse.json({ error: "invalid owner" }, { status: 400 });
  }

  // 1. Token list
  let tokens: Token[] = [];
  try {
    const markets = await fetch(new URL("/api/markets/", request.url), { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const data = (await markets.json()) as { tokens?: Token[] };
    tokens = Array.isArray(data.tokens) ? data.tokens : [];
  } catch {
    return NextResponse.json({ error: "market feed unavailable" }, { status: 502 });
  }

  // 2. Balance scan (batched, concurrency-limited)
  const holdings: { token: Token; balance: string; decimals: number; valueUsd: number }[] = [];
  const CONCURRENCY = 8;
  const queue = [...tokens];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const t = queue.shift()!;
      const balHex = await ethCall(t.address, BAL_SIG + owner.slice(2).padStart(64, "0"));
      if (!balHex || BigInt(balHex) === BigInt(0)) continue;
      const decHex = await ethCall(t.address, DEC_SIG);
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

  return NextResponse.json({
    owner,
    totalUsd,
    count: holdings.length,
    holdings,
    scanned: tokens.length,
  });
}
