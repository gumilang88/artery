"use client";

// 1inch Arc (5042) execution — market swap via AggregationRouter + limit order via LOP v4.
// Both verified on-chain 2026-10-03.
//
// Market: POST /api/oneinch swap/swap  → returns tx { to, data, value } → wallet sends.
// Limit:  build FeeTaker extension + EIP-712 sign + POST orderbook → resting order.

import { keccak256, TypedDataEncoder } from "ethers";

export const LOP_ADDRESS_ARC = "0xe08cab0828a67291ec4af1fb3e7f867e206a6bda"; // AggregationRouter = LOP (shared)
export const FEE_TAKER_ARC = "0x50df1e88e7477063d4b8d7f74f45e2c0e26e3f8c";
export const USDC_ARC = "0x3600000000000000000000000000000000000000";
const CHAIN_ID = 5042;

const DOMAIN = { name: "1inch Aggregation Router", version: "6", chainId: CHAIN_ID, verifyingContract: LOP_ADDRESS_ARC };
const ORDER_TYPES = {
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
};

// makerTraits: copied from VERIFIED on-chain orders (0x4e high byte).
// bit254 ALLOW_MULTIPLE_FILLS + bit251 POST_INTERACTION + bit250 NEED_EPOCH_CHECK + bit249 HAS_EXTENSION.
// The low "6add7be7" is the epoch nonce (not expiry) — 1inch Arc accepts it as-is.
const MAKER_TRAITS = "0x4e00000000000000000000000000000000006add7be700000000000000000000";

const AMOUNT_GETTER_DATA = "0x" + FEE_TAKER_ARC.slice(2) + "000000012c640154d85bafc4e68fcf7b4e";
const POST_INTERACTION = "0x" + FEE_TAKER_ARC.slice(2) +
  "000000000000000000000000000000000000000000" +
  "b04465567cce6db411b57aad04851e455d111c62000000012c640154d85bafc4e68fcf7b4e";

function buildExtension(): string {
  const ends = [BigInt(0), BigInt(0), BigInt(37), BigInt(74), BigInt(74), BigInt(74), BigInt(74), BigInt(152)];
  let word = BigInt(0);
  for (let i = 0; i < 8; i++) word |= ends[i] << BigInt(i * 32);
  const offsetsHex = word.toString(16).padStart(64, "0");
  const dataHex = AMOUNT_GETTER_DATA.slice(2) + AMOUNT_GETTER_DATA.slice(2) + POST_INTERACTION.slice(2);
  return "0x" + offsetsHex + dataHex;
}

function makeSalt(extension: string): string {
  const low160 = BigInt(keccak256(extension)) & ((BigInt(1) << BigInt(160)) - BigInt(1));
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  const randomHigh = BigInt("0x" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("")) << BigInt(160);
  return (randomHigh | low160).toString();
}

function toUnits(amount: number, decimals: number): string {
  // Exact conversion — avoid float rounding (no * scale on float).
  // amount is a human decimal like 1.234; convert via string to preserve precision.
  const s = amount.toString();
  const [intPart, fracPart = ""] = s.split(".");
  const frac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  const full = (intPart + frac).replace(/^0+(?=\d)/, "");
  return full || "0";
}

// Encode ERC20 approve call (no ethers Contract needed).
function approveData(spender: string, amount: bigint): string {
  return "0x095ea7b3" + spender.slice(2).padStart(64, "0") + amount.toString(16).padStart(64, "0");
}
const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);

// Ensure `token` has allowance for `spender` >= `amount`. Approves and waits if not.
async function ensureAllowance(
  provider: Provider,
  makerAddress: string,
  token: string,
  spender: string,
  amount: string,
): Promise<{ ok: boolean; approved: boolean }> {
  try {
    // Check allowance via server RPC (reliable, no wallet eth_call)
    const checkAllowance = async (): Promise<boolean> => {
      const r = await fetch(`/api/balance/?token=${token}&owner=${makerAddress}&spender=${spender}`, { cache: "no-store" });
      if (!r.ok) return false;
      const j = (await r.json()) as { allowance?: string | null };
      if (j.allowance === null || j.allowance === undefined) return false;
      return BigInt(j.allowance) >= BigInt(amount);
    };

    if (await checkAllowance()) return { ok: true, approved: false };

    // Send approve tx via wallet
    await provider.request({
      method: "eth_sendTransaction",
      params: [{ from: makerAddress, to: token, data: approveData(spender, MAX_UINT256) }],
    });

    // Poll server allowance until confirmed (max ~20s)
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkAllowance()) return { ok: true, approved: true };
    }
    return { ok: false, approved: true };
  } catch {
    return { ok: false, approved: false };
  }
}

type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export type ExecResult = { ok: true; hash: string } | { ok: false; error: string };

// ── MARKET SWAP ────────────────────────────────────────────────
// Direct 1inch AggregationRouter swap. Zero deploy, best route across ARC pools.
export async function marketSwap(p: {
  side: "buy" | "sell";
  tokenAddress: string;
  tokenDecimals: number;
  usdcAmount: number;      // buy: USDC spent | sell: token worth in USDC (approx)
  tokenAmount: number;     // buy: token received | sell: token spent
  makerAddress: string;
  provider: Provider;
}): Promise<ExecResult> {
  try {
    const { side, tokenAddress, tokenDecimals, usdcAmount, tokenAmount, makerAddress, provider } = p;

    // src/dst for swap
    const src = side === "buy" ? USDC_ARC : tokenAddress;
    const dst = side === "buy" ? tokenAddress : USDC_ARC;
    const srcAmount = side === "buy" ? toUnits(usdcAmount, 6) : toUnits(tokenAmount, tokenDecimals);

    const r = await fetch(
      `/api/oneinch/?svc=swap&path=/swap&src=${src}&dst=${dst}&amount=${srcAmount}&from=${makerAddress}&slippage=1`,
      { cache: "no-store" }
    );
    const json = (await r.json()) as { tx?: { to: string; data: string; value?: string; gas?: number }; description?: string; message?: string };

    if (!r.ok || !json.tx) {
      return { ok: false, error: json.description || json.message || "swap quote failed" };
    }

    // Ensure src token allowance to AggregationRouter before swapping
    const approval = await ensureAllowance(provider, makerAddress, src, json.tx.to, srcAmount);
    if (!approval.ok) {
      return { ok: false, error: "Token approval failed. Check wallet and retry." };
    }

    // Send tx via wallet
    const txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{
        from: makerAddress,
        to: json.tx.to,
        data: json.tx.data,
        value: json.tx.value || "0x0",
        gas: json.tx.gas ? "0x" + json.tx.gas.toString(16) : undefined,
      }],
    })) as string;

    return { ok: true, hash: txHash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── LIMIT ORDER ────────────────────────────────────────────────
export async function placeLimitOrder(p: {
  side: "buy" | "sell";
  tokenAddress: string;
  tokenDecimals: number;
  tokenAmount: number;
  limitPriceUsd: number;
  makerAddress: string;
  provider: Provider;
}): Promise<ExecResult> {
  try {
    const { side, tokenAddress, tokenDecimals, tokenAmount, limitPriceUsd, makerAddress, provider } = p;

    const usdcAmount = tokenAmount * limitPriceUsd;
    const makerAsset = side === "sell" ? tokenAddress : USDC_ARC;
    const takerAsset = side === "sell" ? USDC_ARC : tokenAddress;
    const makingAmount = side === "sell" ? toUnits(tokenAmount, tokenDecimals) : toUnits(usdcAmount, 6);
    const takingAmount = side === "sell" ? toUnits(usdcAmount, 6) : toUnits(tokenAmount, tokenDecimals);

    const extension = buildExtension();
    const salt = makeSalt(extension);

    // Ensure maker asset allowance to LOP contract before placing order
    const approval = await ensureAllowance(provider, makerAddress, makerAsset, LOP_ADDRESS_ARC, makingAmount);
    if (!approval.ok) {
      return { ok: false, error: "Token approval failed. Check wallet and retry." };
    }

    const order = {
      salt,
      maker: makerAddress,
      receiver: FEE_TAKER_ARC,
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      makerTraits: MAKER_TRAITS,
    };

    const typedData = {
      types: { EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ], ...ORDER_TYPES },
      domain: DOMAIN,
      primaryType: "Order",
      message: order,
    };

    const signature = (await provider.request({
      method: "eth_signTypedData_v4",
      params: [makerAddress, JSON.stringify(typedData)],
    })) as string;

    const orderHash = TypedDataEncoder.hash(DOMAIN, ORDER_TYPES, order);

    const r = await fetch("/api/oneinch/?svc=orderbook&path=/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderHash, signature, data: { ...order, extension } }),
      cache: "no-store",
    });
    const json = (await r.json()) as { orderHash?: string; description?: string; message?: string; error?: string };

    if (!r.ok || json.error) {
      return { ok: false, error: json.description || json.message || json.error || `HTTP ${r.status}` };
    }
    return { ok: true, hash: json.orderHash || orderHash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
