"use client";

// 1inch client via same-origin proxy (/api/oneinch). No API key, no CORS, no deploy.

export type OneinchOrder = {
  orderHash: string;
  createDateTime: string;
  remainingMakerAmount: string;
  makerBalance: string;
  makerAllowance: string;
  data: {
    makerAsset: string;
    takerAsset: string;
    salt: string;
    receiver: string;
    makingAmount: string;
    takingAmount: string;
    maker: string;
    // interations / postInteraction omitted — only needed for fill
  };
  signature?: string;
};

async function get(path: string, params: Record<string, string> = {}, svc = "swap"): Promise<unknown> {
  const q = new URLSearchParams({ svc, path, ...params });
  const r = await fetch(`/api/oneinch/?${q.toString()}`, { cache: "no-store" });
  const body = await r.json();
  if (!r.ok) throw new Error((body as { error?: string })?.error || `1inch ${r.status}`);
  return body;
}

// Swap quote: returns { dstAmount, ... } raw
export async function quote(src: string, dst: string, amount: string): Promise<{ dstAmount: string }> {
  return (await get("/quote", { src, dst, amount })) as { dstAmount: string };
}

export async function orderbookCount(): Promise<number> {
  const r = (await get("/count", {}, "orderbook")) as { count: number };
  return r.count;
}

export async function orderbookAll(page = 1, limit = 100): Promise<OneinchOrder[]> {
  return (await get("/all", { page: String(page), limit: String(limit) }, "orderbook")) as OneinchOrder[];
}

export async function openOrdersByMaker(maker: string): Promise<OneinchOrder[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(maker)) throw new Error("Invalid wallet address");
  return (await get(`/address/${maker}`, { page: "1", limit: "100" }, "orderbook")) as OneinchOrder[];
}

// Price for a token denominated in USDC via 1inch quote (1 unit -> USDC).
export async function usdcPrice(token: string, tokenDecimals = 18): Promise<number> {
  const USDC = "0x3600000000000000000000000000000000000000";
  const one = "1" + "0".repeat(tokenDecimals);
  const q = await quote(token, USDC, one);
  return Number(q.dstAmount) / 1e6; // USDC 6 decimals
}
