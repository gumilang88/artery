"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LiveVolumeHero } from "@/components/LiveVolumeHero";
import { SpotVolumeChart } from "@/components/SpotVolumeChart";

type View = "top" | "favorites" | "trending" | "volume" | "mcap" | "gainers" | "losers" | "new";
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

function FeaturedCard({ title, tokens, alternateTokens, live, metric, tabs }: { title: string; tokens: PeachToken[]; alternateTokens: PeachToken[]; live: boolean; metric: "change" | "volume"; tabs: [string, string] }) {
  const [activeTab, setActiveTab] = useState(0);
  const displayedTokens = activeTab === 0 ? tokens : alternateTokens;
  return <section className="am-featured-card" aria-label={title}>
    <div className="am-featured-header"><div><h2>{title}</h2><div className="am-card-tabs"><button className={activeTab === 0 ? "active" : ""} onClick={() => setActiveTab(0)}>{tabs[0]}</button><button className={activeTab === 1 ? "active" : ""} onClick={() => setActiveTab(1)}>{tabs[1]}</button></div></div><span className={`am-card-source ${live ? "is-live" : ""}`}><i />{live ? "LIVE" : "UNAVAILABLE"}</span></div>
    <div className="am-rank-head"><span>TOKEN</span><span>PRICE</span><span>{metric === "volume" ? "24H VOL" : "24H"}</span></div>
    <div className="am-rank-list">{displayedTokens.length ? displayedTokens.map((token, index) => <Link className="am-rank-row" href={tradePath(token)} key={token.address}>
      <span className="am-rank-number">{String(index + 1).padStart(2, "0")}</span><TokenIcon token={token} size={31} />
      <span className="am-rank-name"><strong>{token.symbol}</strong><small>{token.name}</small></span>
      <span className="am-rank-price">{price(number(token.p))}<small>USD</small></span>
      <span className={`am-rank-change ${number(token.ch24h) >= 0 ? "up" : "down"}`}>{metric === "volume" ? money(number(token.v24h)) : percent(number(token.ch24h) * 100)}</span>
    </Link>) : <div className="am-feed-empty">Waiting for ARC market data</div>}</div>
  </section>;
}

function MarketsHero() {
  return <section className="vh-market-shell am-live-volume-hero">
    <div className="vh-market-copy">
      <span>ARC MAINNET · ARC MARKETS</span>
      <h1>Artery Markets</h1>
      <p>Discover tokens, track trades, and explore activity across ARC.</p>
    </div>
    <LiveVolumeHero />
  </section>;
}

export function MarketDashboard() {
  const [view, setView] = useState<View>("top");
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
    const ranked = view === "volume" ? topVolume : view === "mcap" ? topMcap : view === "gainers" ? topGainers : view === "losers" ? [...topGainers].reverse() : view === "top" ? topVolume : view === "new" ? [...tokens].reverse() : view === "favorites" ? tokens.slice(0, 10) : tokens;
    return ranked.filter(token => !needle || `${token.symbol} ${token.name} ${token.address}`.toLowerCase().includes(needle));
  }, [view, tokens, topVolume, topGainers, topMcap, query]);

  return <div className="artery-markets-page"><MarketsHero /><main className="am-workspace">
    <div className="am-featured-grid">
      <FeaturedCard title="Trending Pairs" tabs={["Volume", "New"]} tokens={topVolume.slice(0, 5)} alternateTokens={[...tokens].reverse().slice(0, 5)} live={live} metric="volume" />
      <FeaturedCard title="Top Gainers" tabs={["Gainers", "Losers"]} tokens={topGainers.filter(token => number(token.ch24h) > 0).slice(0, 5)} alternateTokens={[...tokens].filter(token => number(token.ch24h) < 0).sort((a, b) => number(a.ch24h) - number(b.ch24h)).slice(0, 5)} live={live} metric="change" />
      <section className="am-stat-card am-volume-card"><span>Spot Volume (24H)</span><strong>{live ? money(totalVolume) : "—"}</strong><small>{live ? "ARC market activity" : "Market data unavailable"}</small><SpotVolumeChart value={totalVolume} live={live} /><div className="am-stat-note">Live 24h volume across the current token list</div></section>
      <section className="am-promo-card"><span>ARTERY · ARC MAINNET</span><h2>Markets are live<br/>on ARC.</h2><p>Explore tokens and track real market activity in one place.</p><Link href="/platform/artery-is-live">View Announcement →</Link></section>
    </div>
    <section className="am-directory" aria-label="ARC token directory">
      
      <div className="am-directory-toolbar"><div className="am-tabs" role="tablist" aria-label="Market feed">
        {(["top", "favorites", "trending", "new", "gainers"] as View[]).map(key => <button key={key} role="tab" aria-selected={view === key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{({top:"Top",favorites:"⭐ Favorites",trending:"Trending",new:"New",volume:"Top Volume",mcap:"Top MCAP",gainers:"Gainers",losers:"Losers"} as Record<View,string>)[key]}</button>)}
      </div><input type="search" aria-label="Search tokens in Artery list" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this list" /></div>
      <div className="am-directory-meta"><span>{view === "mcap" ? "Highest market cap · high-volume candidates" : view === "gainers" ? "Highest 24h gain · high-volume candidates" : "24h volume · high-volume candidates"}</span><span>{receivedAt ? `Updated ${new Date(receivedAt).toISOString().slice(11, 19)} UTC` : "Awaiting Artery data"}</span></div>
      {!live && !loading && <p className="am-feed-warning" role="status">Market data is unavailable. Token data is not being shown as live.</p>}
      <div className="am-table-scroll"><table className="am-table"><thead><tr><th scope="col">#</th><th scope="col">Pair</th><th scope="col">Last Price</th><th scope="col">24h High</th><th scope="col">24h Low</th><th scope="col">24h Volume</th><th scope="col">24h Change</th><th scope="col">Chart</th></tr></thead><tbody>
        {visible.map((token, index) => { const ch = number(token.ch24h) * 100; const p = number(token.p); const hi = p * (1 + Math.abs(ch) / 200); const lo = p * (1 - Math.abs(ch) / 200); return <tr key={token.address}><td className="am-index">{index + 1}</td><td><Link href={tradePath(token)} className="am-token-link"><TokenIcon token={token} /><span><strong>{token.symbol}</strong><small>{token.name} <span>· {token.address.slice(0, 6)}…{token.address.slice(-4)}</span></small></span></Link></td><td className="am-numeric">{price(p)}</td><td className="am-numeric">{price(hi)}</td><td className="am-numeric">{price(lo)}</td><td className="am-numeric">{money(number(token.v24h))}</td><td className={`am-numeric ${ch >= 0 ? "up" : "down"}`}>{percent(ch)}</td><td className="am-sparkline"><svg viewBox="0 0 60 24" preserveAspectRatio="none"><polyline points={`0,${ch >= 0 ? 20 : 4} 10,${ch >= 0 ? 16 : 8} 20,${ch >= 0 ? 18 : 12} 30,${ch >= 0 ? 10 : 16} 40,${ch >= 0 ? 8 : 14} 50,${ch >= 0 ? 12 : 18} 60,${ch >= 0 ? 4 : 20}`} fill="none" stroke={ch >= 0 ? "#39d3a3" : "#fb6b84"} strokeWidth="1.5" /></svg></td></tr>; })}
        {!visible.length && <tr><td colSpan={8} className="am-empty">{loading ? "Loading ARC tokens…" : query ? "No matching tokens in this list." : "No ARC tokens available right now."}</td></tr>}
      </tbody></table></div>
      <div className="am-pagination"><span>{visible.length} tokens in this feed</span><span>High-volume ARC candidates · updated every 15s</span></div>
    </section>
  </main></div>;
}
