"use client";

// 1inch Limit Order Protocol v4 — Arc (chain 5042)
// Contract: 0xe08cab0828a67291ec4af1fb3e7f867e206a6bda
// EIP-712 domain: name="1inch Aggregation Router" version="6"
// Submit: POST /api/oneinch/?svc=orderbook&path=/ (no suffix)

export const LOP_ADDRESS_ARC = "0xe08cab0828a67291ec4af1fb3e7f867e206a6bda";
export const USDC_ARC = "0x3600000000000000000000000000000000000000";
const CHAIN_ID = 5042;

// EIP-712 typed data for 1inch LOP v4
function buildTypedData(order: LopOrderStruct) {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Order: [
        { name: "salt", type: "uint256" },
        { name: "maker", type: "address" },
        { name: "receiver", type: "address" },
        { name: "makerAsset", type: "address" },
        { name: "takerAsset", type: "address" },
        { name: "makingAmount", type: "uint256" },
        { name: "takingAmount", type: "uint256" },
        { name: "makerTraits", type: "uint256" },
      ],
    },
    domain: {
      name: "1inch Aggregation Router",
      version: "6",
      chainId: CHAIN_ID,
      verifyingContract: LOP_ADDRESS_ARC,
    },
    primaryType: "Order",
    message: order,
  };
}

export type LopOrderStruct = {
  salt: string;
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  makerTraits: string;
};

// Compute keccak256 of the typed data using eth_signTypedData_v4 (browser signs = hashes internally)
// We just need the orderHash for submission — derive it via eth_call or accept from API after submit.

// Random salt
function randomSalt(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return BigInt("0x" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("")).toString();
}

// Build amount strings from human-readable inputs
function toUnits(amount: number, decimals: number): string {
  return BigInt(Math.round(amount * 10 ** Math.min(decimals, 9)) * 10 ** Math.max(decimals - 9, 0)).toString();
}

type PlaceLimitOrderParams = {
  side: "buy" | "sell";
  tokenAddress: string;          // the non-USDC token
  tokenDecimals: number;
  tokenAmount: number;           // amount of token (always)
  limitPriceUsd: number;         // price in USD per token
  makerAddress: string;          // connected wallet
  provider: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
};

export type LopResult =
  | { ok: true; orderHash: string }
  | { ok: false; error: string };

export async function placeLimitOrder(p: PlaceLimitOrderParams): Promise<LopResult> {
  try {
    const { side, tokenAddress, tokenDecimals, tokenAmount, limitPriceUsd, makerAddress, provider } = p;

    // Buy: maker gives USDC, taker fills with token
    // Sell: maker gives token, taker fills with USDC
    const usdcAmount = tokenAmount * limitPriceUsd;

    const makerAsset = side === "sell" ? tokenAddress : USDC_ARC;
    const takerAsset = side === "sell" ? USDC_ARC : tokenAddress;
    const makingAmount = side === "sell"
      ? toUnits(tokenAmount, tokenDecimals)
      : toUnits(usdcAmount, 6);
    const takingAmount = side === "sell"
      ? toUnits(usdcAmount, 6)
      : toUnits(tokenAmount, tokenDecimals);

    const order: LopOrderStruct = {
      salt: randomSalt(),
      maker: makerAddress,
      receiver: "0x0000000000000000000000000000000000000000",
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      makerTraits: "0",
    };

    const typedData = buildTypedData(order);

    // Sign via wallet (MetaMask/Rabby eth_signTypedData_v4)
    const signature = (await provider.request({
      method: "eth_signTypedData_v4",
      params: [makerAddress, JSON.stringify(typedData)],
    })) as string;

    // Submit to 1inch orderbook via our proxy
    // POST /api/oneinch/?svc=orderbook&path=/  (base = /v2.0/orderbook/v4.0/5042)
    const body = { signature, data: order };
    const r = await fetch("/api/oneinch/?svc=orderbook&path=/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = (await r.json()) as { orderHash?: string; error?: string; description?: string; message?: string };

    if (!r.ok) {
      const msg = json.description || json.message || json.error || `HTTP ${r.status}`;
      return { ok: false, error: msg };
    }

    const orderHash = json.orderHash || "submitted";
    return { ok: true, orderHash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
