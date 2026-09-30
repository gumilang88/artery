"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type View = "top" | "trending" | "volume" | "mcap" | "gainers" | "losers";
type PeachToken = {
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  logoURI?: string;
  p?: string;
  mcap?: string;
  liqUsd?: string;
  v24h?: string;
  ch24h?: string;
  states?: { tp: string; vu?: string; pc?: number }[];
};
const number = (value: unknown) => Number(value) || 0;
const money = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const price = (value: number) => value > 0 ? `$${value >= 1 ? value.toLocaleString("en-US", { maximumFractionDigits: 4 }) : value.toPrecision(5).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")}` : "—";
const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
const tradePath = (token: PeachToken) => `/trade?token=${encodeURIComponent(token.address)}&symbol=${encodeURIComponent(token.symbol)}`;

function TokenIcon({ token, size = 34 }: { token: PeachToken; size?: number }) {
  const [failed, setFailed] = useState(false);
  const cid = token.logoURI?.match(/^https:\/\/white-absolute-anglerfish-566\.mypinata\.cloud\/ipfs\/(baf[a-z2-7]{20,120})$/)?.[1];
  const src = cid ? `/api/token-icon/?cid=${cid}` : token.logoURI;
  return <span className="am-token-icon" style={{ width: size, height: size }}>
    <span>{(token.symbol || "?").slice(0, 2).toUpperCase()}</span>
    {src && !failed && <img src={src} alt="" onError={() => setFailed(true)} />}
  </span>;
}

function FeaturedCard({ title, subtitle, tokens, live, metric }: { title: string; subtitle: string; tokens: PeachToken[]; live: boolean; metric: "change" | "volume" }) {
  return <section className="am-featured-card" aria-label={title}>
    <div className="am-featured-header"><div><span className="am-eyebrow">ARTERY / ARC MAINNET</span><h2>{title}</h2><p>{subtitle}</p></div><span className={`am-card-source ${live ? "is-live" : ""}`}><i />{live ? "LIVE" : "UNAVAILABLE"}</span></div>
    <div className="am-rank-head"><span>TOKEN</span><span>PRICE</span><span>{metric === "volume" ? "24H VOL" : "24H"}</span></div>
    <div className="am-rank-list">{tokens.length ? tokens.map((token, index) => <Link className="am-rank-row" href={tradePath(token)} key={token.address}>
      <span className="am-rank-number">{String(index + 1).padStart(2, "0")}</span><TokenIcon token={token} size={31} />
      <span className="am-rank-name"><strong>{token.symbol}</strong><small>{token.name}</small></span>
      <span className="am-rank-price">{price(number(token.p))}<small>USD</small></span>
      <span className={`am-rank-change ${number(token.ch24h) >= 0 ? "up" : "down"}`}>{metric === "volume" ? money(number(token.v24h)) : percent(number(token.ch24h) * 100)}</span>
    </Link>) : <div className="am-feed-empty">Waiting for ARC market data</div>}</div>
  </section>;
}

function MarketsHero() {
  const orbs = [
    { label: "USDC", image: "/tokens/usdc.png", color: "#4678d9", x: 5, y: 128 },
    { label: "ARC", image: "", color: "#f5699b", x: 29, y: 48 },
    { label: "WETH", image: "/tokens/weth.png", color: "#827fee", x: 53, y: 150 },
    { label: "cirBTC", image: "/tokens/cirbtc.png", color: "#f3a754", x: 79, y: 61 },
  ];
  return <section className="am-hero"><div className="am-hero-copy"><span className="am-eyebrow">ARC MAINNET · ARC MARKETS</span><h1>Artery Markets</h1><p>Discover tokens, track trades, and explore activity across ARC.</p></div><div className="am-orbit" aria-label="USDC, ARC, WETH and cirBTC market assets">
    {orbs.map(orb => <div className="am-orb" key={orb.label} style={{ "--orb-color": orb.color, left: `${orb.x}%`, top: orb.y } as React.CSSProperties}><div className="am-orb-sphere">{orb.image && <img src={orb.image} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />}<span>{orb.label}</span></div><div className="am-orb-base" /></div>)}
  </div></section>;
}

export function MarketDashboard() {
  const [view, setView] = useState<View>("volume");
  const [tokens, setTokens] = useState<PeachToken[]>([]);
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [partial, setPartial] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/markets/", { cache: "no-store" });
        if (!response.ok) throw new Error("Market feed unavailable");
        const data = await response.json();
        if (!Array.isArray(data.tokens)) throw new Error("Invalid feed");
        if (active) { setTokens(data.tokens); setLive(true); setReceivedAt(data.receivedAt); setPartial(Boolean(data.partial)); }
      } catch { if (active) setLive(false); }
      finally { if (active) setLoading(false); }
    };
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 15_000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  const topVolume = useMemo(() => [...tokens].sort((a, b) => number(b.v24h) - number(a.v24h)), [tokens]);
  const topGainers = useMemo(() => [...tokens].sort((a, b) => number(b.ch24h) - number(a.ch24h)), [tokens]);
  const topMcap = useMemo(() => [...tokens].sort((a, b) => number(b.mcap) - number(a.mcap)), [tokens]);
  const totalVolume = useMemo(() => tokens.reduce((sum, token) => sum + number(token.v24h), 0), [tokens]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ranked = view === "volume" ? topVolume : view === "mcap" ? topMcap : view === "gainers" ? topGainers : view === "losers" ? [...topGainers].reverse() : tokens;
    return ranked.filter(token => !needle || `${token.symbol} ${token.name} ${token.address}`.toLowerCase().includes(needle));
  }, [view, tokens, topVolume, topGainers, topMcap, query]);

  return <div className="artery-markets-page"><MarketsHero /><main className="am-workspace">
    <div className="am-featured-grid">
      <FeaturedCard title="Trending Pairs" subtitle="Volume · 24h" tokens={topVolume.slice(0, 5)} live={live} metric="volume" />
      <FeaturedCard title="Top Gainers" subtitle="24h change" tokens={topGainers.slice(0, 5)} live={live} metric="change" />
      <section className="am-stat-card"><span>Spot Volume (24H)</span><strong>{live ? money(totalVolume) : "—"}</strong><small>{live ? "ARC market activity" : "Market data unavailable"}</small><div className="am-stat-note">Live 24h volume across the current token list</div></section>
      <section className="am-promo-card"><span>ARTERY · ARC MAINNET</span><h2>Markets are live<br/>on ARC.</h2><p>Explore tokens and track real market activity in one place.</p><Link href="/platform/artery-is-live">View Announcement →</Link></section>
    </div>
    <section className="am-directory" aria-label="ARC token directory">
      
      <div className="am-directory-toolbar"><div className="am-tabs" role="tablist" aria-label="Market feed">
        {(["volume", "mcap", "gainers", "losers", "trending"] as View[]).map(key => <button key={key} role="tab" aria-selected={view === key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{({top:"Top",trending:"Trending",volume:"Top Volume",mcap:"Top MCAP",gainers:"Gainers",losers:"Losers"} as Record<View,string>)[key]}</button>)}
      </div><input type="search" aria-label="Search tokens in Artery list" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this list" /></div>
      <div className="am-directory-meta"><span>{view === "mcap" ? "Highest market cap · high-volume candidates" : view === "gainers" ? "Highest 24h gain · high-volume candidates" : "24h volume · high-volume candidates"}</span><span>{receivedAt ? `Updated ${new Date(receivedAt).toISOString().slice(11, 19)} UTC` : "Awaiting Artery data"}</span></div>
      {!live && !loading && <p className="am-feed-warning" role="status">Market data is unavailable. Token data is not being shown as live.</p>}
      <div className="am-table-scroll"><table className="am-table"><thead><tr><th scope="col">#</th><th scope="col">Pair</th><th scope="col">Last Price</th><th scope="col">Market Cap</th><th scope="col">Liquidity</th><th scope="col">24h Volume</th><th scope="col">24h Change</th></tr></thead><tbody>
        {visible.map((token, index) => <tr key={token.address}><td className="am-index">{index + 1}</td><td><Link href={tradePath(token)} className="am-token-link"><TokenIcon token={token} /><span><strong>{token.symbol}</strong><small>{token.name} <span>· {token.address.slice(0, 6)}…{token.address.slice(-4)}</span></small></span></Link></td><td className="am-numeric">{price(number(token.p))}</td><td className="am-numeric">{money(number(token.mcap))}</td><td className="am-numeric">{money(number(token.liqUsd))}</td><td className="am-numeric">{money(number(token.v24h))}</td><td className={`am-numeric ${number(token.ch24h) >= 0 ? "up" : "down"}`}>{percent(number(token.ch24h) * 100)}</td></tr>)}
        {!visible.length && <tr><td colSpan={7} className="am-empty">{loading ? "Loading ARC tokens…" : query ? "No matching tokens in this list." : "No ARC tokens available right now."}</td></tr>}
      </tbody></table></div>
      <div className="am-pagination"><span>{visible.length} tokens in this feed</span><span>High-volume ARC candidates · updated every 15s</span></div>
    </section>
  </main></div>;
}
