"use client";

import { useEffect, useMemo, useState } from "react";
import { OneinchOrder, orderbookAll } from "@/lib/oneinch";

type Level = { price: number; size: number; total: number };

// Aggregates open 1inch limit orders (ARC 5042) into bid/ask levels for one pair.
// Orders denominated against USDC (takerAsset or makerAsset == USDC) are priced
// in USD directly; other pairs are skipped until a price oracle is wired.
export function OneinchBook({ token, refPrice }: { token: string; refPrice?: number }) {
  const [orders, setOrders] = useState<OneinchOrder[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const all = await orderbookAll(1, 200);
        if (!active) return;
        setOrders(all);
        setLive(true);
      } catch {
        if (active) setLive(false);
      }
    };
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const book = useMemo(() => {
    const USDC = "0x3600000000000000000000000000000000000000";
    const target = token.toLowerCase();
    const asks: Level[] = [];
    const bids: Level[] = [];
    for (const o of orders) {
      const maker = o.data.makerAsset.toLowerCase();
      const taker = o.data.takerAsset.toLowerCase();
      const making = Number(o.data.makingAmount);
      const taking = Number(o.data.takingAmount);
      if (!Number.isFinite(making) || !Number.isFinite(taking) || making <= 0 || taking <= 0) continue;
      // Buy target token with USDC: takerAsset == target, makerAsset == USDC
      if (taker === target && maker === USDC) {
        // price in USDC per target token = taking/making
        asks.push({ price: taking / making, size: making, total: taking });
      }
      // Sell target token for USDC: makerAsset == target, takerAsset == USDC
      else if (maker === target && taker === USDC) {
        bids.push({ price: taking / making, size: making, total: taking });
      }
    }
    asks.sort((a, b) => a.price - b.price);
    bids.sort((a, b) => b.price - a.price);
    // Drop orders far from the reference price (spam/dust at extreme levels).
    const anchor = refPrice && refPrice > 0 ? refPrice : null;
    const inRange = (l: Level) => {
      if (!anchor) return true;
      return l.price > anchor / 50 && l.price < anchor * 50;
    };
    const asksF = anchor ? asks.filter(inRange) : asks;
    const bidsF = anchor ? bids.filter(inRange) : bids;
    return { asks: asksF.slice(0, 12), bids: bidsF.slice(0, 12) };
  }, [orders, token, refPrice]);

  const maxTotal = Math.max(1, ...book.asks.map(l => l.total), ...book.bids.map(l => l.total));
  const row = (l: Level, i: number, key: string, cls: string) => (
    <div key={key} className={`at-book-row ${cls}`}>
      <span className="at-depth-bar" style={{ width: `${(l.total / maxTotal) * 100}%` }} />
      <span>${l.price >= 1 ? l.price.toFixed(4) : l.price.toPrecision(5)}</span>
      <span>{fmt(l.size)}</span>
      <span>{fmt(l.total)}</span>
    </div>
  );

  const mid = book.asks[0] && book.bids[0] ? (book.asks[0].price + book.bids[0].price) / 2 : null;
  const spread = book.asks[0] && book.bids[0] ? ((book.asks[0].price - book.bids[0].price) / book.asks[0].price) * 100 : null;

  return (
    <div className="at-book-depth">
      <div className="at-book-labels"><span>Price (USD)</span><span>Size</span><span>Total</span></div>
      <div className="at-book-asks">{book.asks.map((l, i) => row(l, i, `ask-${i}`, "ask"))}</div>
      <div className="at-book-spread">
        <strong>{mid ? `$${mid.toPrecision(5)}` : "—"}</strong>
        <small>{spread != null ? `Spread · ${spread.toFixed(2)}%` : live ? "No open orders for this pair" : "Loading 1inch order book…"}</small>
      </div>
      <div className="at-book-bids">{book.bids.map((l, i) => row(l, i, `bid-${i}`, "bid"))}</div>
      <div className="at-book-footer">
        {live ? `${book.asks.length + book.bids.length} open orders · 1inch LOP` : "Order book unavailable"}
      </div>
    </div>
  );
}

function fmt(x: number) {
  if (!Number.isFinite(x) || x <= 0) return "—";
  if (x >= 1e6) return `${(x / 1e6).toFixed(2)}M`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1)}K`;
  return x >= 1 ? x.toLocaleString("en-US", { maximumFractionDigits: 2 }) : x.toPrecision(4);
}
