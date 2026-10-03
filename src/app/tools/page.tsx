"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";

type Holding = {
  token: { address: string; symbol: string; name: string; logoURI?: string; p: string; ch24h: string; v24h: string };
  balance: string;
  decimals: number;
  valueUsd: number;
};

const usd = (x: unknown) => {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toPrecision(2)}`;
};
const amt = (balance: string, decimals: number) => {
  const n = Number(balance) / Math.pow(10, decimals);
  return Number(n.toPrecision(6));
};

export default function PortfolioPage() {
  const wallet = useWallet();
  const walletAddress = wallet.address;
  const [data, setData] = useState<{ totalUsd: number; holdings: Holding[]; scanned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!walletAddress) { setData(null); return; }
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const r = await fetch(`/api/portfolio/?owner=${walletAddress}`, { cache: "no-store" });
        if (!r.ok) throw Error("portfolio fetch failed");
        const d = await r.json();
        if (active) setData(d);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "error");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const t = window.setInterval(() => { if (!document.hidden) load(); }, 20000);
    return () => { active = false; window.clearInterval(t); };
  }, [walletAddress]);

  return (
    <main className="pf-page">
      <div className="pf-hero">
        <div>
          <span className="hm-eyebrow"><i /> ARC Mainnet · Portfolio</span>
          <h1>Portfolio</h1>
          <p>Your ARC token holdings, valued at current market prices.</p>
        </div>
        <div className="pf-total">
          <small>Total Value</small>
          <b>{data ? usd(data.totalUsd) : loading ? "…" : "—"}</b>
        </div>
      </div>

      {!walletAddress ? (
        <div className="pf-connect">
          <p>Connect your wallet to scan your ARC token holdings.</p>
          <button className="pf-connect-btn" onClick={wallet.connect} disabled={wallet.connecting}>
            {wallet.connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      ) : loading && !data ? (
        <div className="pf-empty">Scanning ARC tokens…</div>
      ) : error ? (
        <div className="pf-empty">Failed to load portfolio: {error}</div>
      ) : data && data.holdings.length === 0 ? (
        <div className="pf-empty">
          No token holdings found for this wallet.
          <small>Scanned {data.scanned} ARC tokens.</small>
        </div>
      ) : data ? (
        <>
          <div className="pf-meta">
            <span>{data.holdings.length} assets</span>
            <span>Scanned {data.scanned} ARC tokens</span>
          </div>
          <section className="pf-panel">
            <div className="pf-table-head">
              <span>Asset</span><span>Balance</span><span>Price</span><span>24h</span><span>Value</span>
            </div>
            <div className="pf-table">
              {data.holdings.map(h => (
                <Link key={h.token.address} href={`/trade?token=${h.token.address}&symbol=${encodeURIComponent(h.token.symbol)}`} className="pf-row">
                  <span className="pf-asset"><b>{h.token.symbol}</b><small>{h.token.name}</small></span>
                  <span className="pf-bal">{amt(h.balance, h.decimals)}</span>
                  <span>${Number(Number(h.token.p).toPrecision(6))}</span>
                  <span className={Number(h.token.ch24h) >= 0 ? "up" : "down"}>{(Number(h.token.ch24h) * 100).toFixed(2)}%</span>
                  <span className="pf-val">{usd(h.valueUsd)}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
