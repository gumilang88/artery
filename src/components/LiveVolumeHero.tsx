"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MarketToken = {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  v24h?: string;
  ch24h?: string;
};

const colors = ["#ff9638", "#687cff", "#28d6aa", "#39d1c6", "#f15682", "#795bff", "#3cd0f2", "#ffcf48", "#a9b4c5", "#ec65ff"];
const money = (value: number) => value >= 1e6 ? `$${(value / 1e6).toFixed(2)}M` : value >= 1e3 ? `$${(value / 1e3).toFixed(1)}K` : `$${value.toFixed(0)}`;
const imageSource = (url?: string) => {
  const cid = url?.match(/^https:\/\/white-absolute-anglerfish-566\.mypinata\.cloud\/ipfs\/(baf[a-z2-7]{20,120})$/)?.[1];
  return cid ? `/api/token-icon/?cid=${cid}` : url || "";
};

function LiveCoin({ token, rank, height, color }: { token: MarketToken; rank: number; height: number; color: string }) {
  const [failed, setFailed] = useState(false);
  const src = imageSource(token.logoURI);
  return <Link
    href={`/trade?token=${encodeURIComponent(token.address)}&symbol=${encodeURIComponent(token.symbol)}`}
    className="vh-coin"
    style={{ "--vh-height": `${height}px`, "--vh-color": color, "--vh-delay": `${rank * 90}ms` } as React.CSSProperties}
    aria-label={`${rank + 1}. ${token.symbol}, 24 hour volume ${money(Number(token.v24h) || 0)}`}
  >
    <span className="vh-tooltip"><b>#{rank + 1} {token.symbol}</b><small>{money(Number(token.v24h) || 0)} · 24H VOL</small></span>
    <span className="vh-medal-wrap">
      <span className="vh-medal-edge" />
      <span className="vh-medal">
        <span className="vh-fallback">{token.symbol.slice(0, 2).toUpperCase()}</span>
        {src && !failed && <img src={src} alt="" onError={() => setFailed(true)} />}
        <i />
      </span>
    </span>
    <span className="vh-collar"><i /></span>
    <span className="vh-pillar"><i /></span>
    <span className="vh-rank">{String(rank + 1).padStart(2, "0")}</span>
  </Link>;
}

export function LiveVolumeHero({ preview = false }: { preview?: boolean }) {
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [live, setLive] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/markets/", { cache: "no-store" });
        if (!response.ok) throw new Error("feed");
        const payload = await response.json();
        if (!active || !Array.isArray(payload.tokens)) return;
        setTokens(payload.tokens.slice().sort((a: MarketToken, b: MarketToken) => Number(b.v24h || 0) - Number(a.v24h || 0)).slice(0, 10));
        setUpdated(payload.receivedAt || Date.now());
        setLive(true);
      } catch { if (active) setLive(false); }
    };
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const heights = useMemo(() => {
    if (!tokens.length) return [];
    const values = tokens.map(token => Math.log10(Math.max(1, Number(token.v24h) || 1)));
    const min = Math.min(...values), max = Math.max(...values), span = Math.max(.001, max - min);
    return values.map(value => Math.round(64 + ((value - min) / span) * 104));
  }, [tokens]);
  return <section className={`vh-scene ${preview ? "is-preview" : ""}`}>
    <div className="vh-grid" />
    <div className="vh-stage" aria-label={`Live top ten ARC tokens by 24 hour volume${live ? "" : " · reconnecting"}${updated ? ` · updated ${new Date(updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}`}>
      {tokens.map((token, rank) => <LiveCoin key={token.address} token={token} rank={rank} height={heights[rank] || 64} color={colors[rank]} />)}
      {!tokens.length && Array.from({ length: 10 }, (_, rank) => <span className="vh-skeleton" key={rank} style={{ "--vh-skeleton-delay": `${rank * 80}ms` } as React.CSSProperties} />)}
    </div>
    {preview && <span className="vh-preview-label">DESIGN PREVIEW · NOT APPLIED TO MARKETS</span>}
  </section>;
}
