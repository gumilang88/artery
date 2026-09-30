"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Footer } from "./Footer";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { el.classList.add("is-visible"); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
import {
  ArrowRight,
  BarChart3,
  Blocks,
  Braces,
  CircleDollarSign,
  ExternalLink,
  Gauge,
  Layers3,
  LockKeyhole,
  Radio,
  Route,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
type PeachToken = { address: string; symbol: string; name: string; logoURI?: string; p?: string; v24h?: string; ch24h?: string; mcap?: string; liqUsd?: string; states?: { tp: string; vu?: string }[] };
const fmtMoney = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${v.toFixed(2)}`;
const fmtPrice = (v: number) => v > 0 ? `$${v >= 1 ? v.toLocaleString("en-US", { maximumFractionDigits: 4 }) : v.toPrecision(5)}` : "—";
const fmtChange = (v: number) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
function usePeachMarkets() {
  const [tokens, setTokens] = useState<PeachToken[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => { try { const r = await fetch("/api/peach/", { cache: "no-store" }); if (!r.ok) return; const j = await r.json(); if (active && Array.isArray(j.tokens)) setTokens(j.tokens); } catch {} };
    load(); const timer = window.setInterval(load, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return tokens;
}

const featureCards = [
  { icon: Search, title: "ARC market list", text: "Browse ARC tokens from Artery's five-minute terminal feed." },
  { icon: Route, title: "Contract-first navigation", text: "Open the exact token you selected using its contract address." },
  { icon: BarChart3, title: "Market context", text: "Compare price, liquidity, volume, and 24-hour movement before opening a pair." },
  { icon: Wallet, title: "Wallet-first flow", text: "Review the market and route before connecting a wallet. Trade execution is still in development." },
  { icon: Gauge, title: "Compact trading workspace", text: "Chart, pair details, order entry, and recent activity stay in one view." },
  { icon: Radio, title: "Fresh market data", text: "The Market feed refreshes every 15 seconds while the page is open. Outages are shown clearly." },
  { icon: LockKeyhole, title: "Address-first identity", text: "Duplicate symbols remain distinct because every market is keyed by its contract address." },
  { icon: Blocks, title: "ARC only", text: "Network settings, explorer links, quote assets, and copy are built around ARC Mainnet." },
] as const;

const faq = [
  ["What is Artery?", "Artery is an ARC market interface showing tokens from Artery's ARC terminal."],
  ["Where do the tokens come from?", "The list reads Artery's ARC terminal feed with the 5m timeframe. If the source is unavailable, Artery shows an unavailable state rather than a stale list."],
  ["Does Artery custody funds?", "The current interface displays market data and a trading preview. Onchain execution has not been enabled."],
  ["Why can two tokens share a symbol?", "Symbols are display labels. Artery identifies markets by contract address, so duplicate symbols remain separate."],
  ["What do the prices represent?", "Prices shown in the market list are Artery's USD reference prices. The trading interface remains a preview, not an executable quote."],
  ["Is the trading button live?", "The current build contains the complete interface and route preparation. Onchain submission is intentionally not presented as live until router execution is wired and verified."],
] as const;

function TokenMark({ src, symbol, size = 28 }: { src?: string; symbol: string; size?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className="hm-token-mark" style={{ width: size, height: size }}>
      <span>{symbol.slice(0, 2)}</span>
      {src && !imageFailed && <img src={src.replace(/^https:\/\/white-absolute-anglerfish-566\.mypinata\.cloud\/ipfs\/(baf[a-z2-7]{20,120})$/, "/api/token-icon/?cid=$1")} alt="" onError={() => setImageFailed(true)} />}
    </span>
  );
}

function MiniMarkets({ tokens }: { tokens: PeachToken[] }) {
  return <div className="hm-market-panel">
    <div className="hm-panel-tabs"><span className="is-active">Trending</span><span>Volume</span><span>ARC · 5M</span></div>
    <div className="hm-table-head"><span>Token</span><span>Price</span><span>24h</span><span>5m Vol</span></div>
    {tokens.slice(0, 8).map(token => <Link key={token.address} href={`/trade?token=${token.address}&symbol=${encodeURIComponent(token.symbol)}`} className="hm-market-row">
      <span className="hm-market-pair"><TokenMark src={token.logoURI} symbol={token.symbol} /><span><b>{token.symbol}</b><small>{token.name}</small></span></span>
      <span>{fmtPrice(Number(token.p))}</span><span className={Number(token.ch24h) >= 0 ? "up" : "down"}>{fmtChange(Number(token.ch24h))}</span>
      <span>{fmtMoney(Number(token.states?.find(s => s.tp === "5m")?.vu || 0))}</span>
    </Link>)}
    {!tokens.length && <div className="hm-market-row">Waiting for ARC market data</div>}
  </div>;
}

function TradingTerminal({ tokens }: { tokens: PeachToken[] }) {
  const market = tokens[0];
  const spark = [0.2, 0.3, 0.4, 0.35, 0.6, 0.7];
  const low = Math.min(...spark);
  const high = Math.max(...spark);
  const range = high - low || 1;
  const points = spark.map((value, index) => `${(index / Math.max(spark.length - 1, 1)) * 100},${90 - ((value - low) / range) * 78}`).join(" ");
  return (
    <div className="hm-terminal">
      <aside className="hm-token-rail">
        {tokens.slice(0, 8).map((token, index) => (
          <span className={index === 0 ? "is-active" : ""} key={token.address}>
            <TokenMark src={token.logoURI} symbol={token.symbol} size={24} />
          </span>
        ))}
      </aside>
      <div className="hm-terminal-main">
        <div className="hm-terminal-ticker">
          <div><b>{market?.symbol || "ARC"} / USD</b><small>Artery · ARC</small></div>
          <div><strong>{market ? fmtPrice(Number(market.p)) : "—"}</strong><small className="up">{market ? fmtChange(Number(market.ch24h)) : "—"}</small></div>
          <div><small>24h volume</small><b>{market ? fmtMoney(Number(market.v24h)) : "—"}</b></div>
          <div><small>Liquidity</small><b>{market ? fmtMoney(Number(market.liqUsd)) : "—"}</b></div>
          <span className="hm-live">INTERFACE PREVIEW</span>
        </div>
        <div className="hm-terminal-tools">
          <span>Chart</span><span>1m</span><span>5m</span><b>1h</b><span>4h</span><span>1D</span><span className="push">Indicators</span><span>⋯</span>
        </div>
        <div className="hm-terminal-body">
          <div className="hm-chart">
            <div className="hm-chart-label"><b>{market?.symbol || "ARC"} / USD</b><span>Illustrative movement · not live candles</span></div>
            <svg className="hm-price-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Illustrative price movement">
              <polyline points={points} fill="none" stroke="#39cfa1" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="hm-axis"><span>HIGH</span><span>LOW</span></div>
          </div>
          <div className="hm-book">
            <div className="hm-book-tabs"><b>Market Details</b></div>
            <div className="hm-book-head"><span>Artery · ARC</span><span>5M</span></div>
            <div className="hm-book-metric"><span>Last price</span><strong>{market ? fmtPrice(Number(market.p)) : "—"}</strong></div>
            <div className="hm-book-metric"><span>24h volume</span><strong>{market ? fmtMoney(Number(market.v24h)) : "—"}</strong></div>
            <div className="hm-book-metric"><span>Liquidity</span><strong>{market ? fmtMoney(Number(market.liqUsd)) : "—"}</strong></div>
            <div className="hm-book-metric"><span>Market cap</span><strong>{market ? fmtMoney(Number(market.mcap)) : "—"}</strong></div>
            <div className="hm-book-address"><span>Token contract</span><code>{market ? `${market.address.slice(0, 8)}…${market.address.slice(-6)}` : "Waiting for feed"}</code></div>
          </div>
        </div>
        <div className="hm-terminal-bottom"><b>Market preview</b><span>ARC token data</span><small>Illustrative chart only</small></div>
      </div>
    </div>
  );
}

function ExecutionPanel({ tokens }: { tokens: PeachToken[] }) {
  const market = tokens[0];
  const inputAmount = 250;
  const estimatedOutput = Number(market?.p) > 0 ? inputAmount / Number(market.p) : 0;
  return (
    <div className="hm-execution-panel">
      <div className="hm-execution-head"><div><span>PREVIEW</span><b>{market?.symbol || "ARC"} / USD</b></div><span className="hm-network-pill"><i /> ARC Mainnet</span></div>
      <div className="hm-route-card">
        <small>You pay</small><div><b>250.00</b><span><CircleDollarSign size={18} /> USDC</span></div>
      </div>
      <div className="hm-route-line"><i /><span>Indicative market price</span></div>
      <div className="hm-route-card">
        <small>Indicative amount · before fees</small><div><b>{estimatedOutput ? estimatedOutput.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}</b><span><TokenMark src={market?.logoURI} symbol={market?.symbol || "ARC"} size={22} /> {market?.symbol || "ARC"}</span></div>
      </div>
      <dl><div><dt>Reference price</dt><dd>{market ? fmtPrice(Number(market.p)) : "—"} USD</dd></div><div><dt>Token contract</dt><dd>{market ? `${market.address.slice(0, 8)}…${market.address.slice(-6)}` : "—"}</dd></div><div><dt>Network</dt><dd>ARC · 5042</dd></div></dl>
      <Link href="/markets/spot" className="hm-primary-action">View market data</Link>
      <p>Illustrative calculation only. No executable quote or transaction.</p>
    </div>
  );
}

export function HomePage() {
  const [open, setOpen] = useState<number | null>(0);
  const ref_chain = useReveal<HTMLElement>();
  const ref_market = useReveal<HTMLElement>();
  const ref_engine = useReveal<HTMLElement>();
  const ref_feature = useReveal<HTMLElement>();
  const ref_execution = useReveal<HTMLElement>();
  const ref_unified = useReveal<HTMLElement>();
  const ref_build = useReveal<HTMLElement>();
  const ref_faq = useReveal<HTMLElement>();
  const peachTokens = usePeachMarkets();
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div>
            <span className="hm-eyebrow"><i /> Built for ARC Mainnet</span>
            <h1>ARC markets in view.<br /><span>One trading desk.</span></h1>
          </div>
          <div className="hm-hero-side">
            <p>Follow the ARC market list, compare five-minute volume, and inspect tokens by contract.</p>
            <div><Link className="home-cta primary" href="/markets/spot">Explore markets <ArrowRight size={15} /></Link><Link className="home-cta" href="/docs/user-docs/start">How it works</Link></div>
          </div>
        </div>
        <TradingTerminal tokens={peachTokens} />
      </section>

      <section ref={ref_chain} className="chain-strip reveal">
        <p>ARC MARKET DATA, BUILT FOR ARTERY</p>
        <div>{["ARC MAINNET", "USDC", "ARGUS", "WETH", "cirBTC", "EURC", "UNISWAP V4"].map((item) => <span key={item}>{item}</span>)}</div>
      </section>

      <section ref={ref_market} className="home-split market-home reveal">
        <div className="home-section-copy">
          <span className="hm-section-label">MARKET DIRECTORY</span>
          <h2>See what is trading<br />before you open a pair.</h2>
          <p>See each token's address, USD price, liquidity, five-minute volume, and daily movement.</p>
          <Link href="/markets/spot">View ARC market list <ArrowRight size={14} /></Link>
          <div className="home-stats"><b>5m<small>Terminal timeframe</small></b><b>100<small>Tokens per request</small></b></div>
        </div>
        <MiniMarkets tokens={peachTokens} />
      </section>

      <section ref={ref_engine} className="engine-section reveal">
        <div className="home-section-copy">
          <span className="hm-section-label">MARKET IDENTITY</span>
          <h2>A ticker is a label.<br />The address is the asset.</h2>
          <p>Market feeds can contain duplicate symbols. Artery keeps each token tied to its contract address so the market you open is the market you selected.</p>
          <div className="hm-proof-list">
            <span><ShieldCheck size={17} /> Address-first routing</span>
            <span><Layers3 size={17} /> Quote asset preserved</span>
            <span><Route size={17} /> Market feed shown</span>
            <span><ExternalLink size={17} /> ARC explorer ready</span>
          </div>
          <div className="home-stats"><b>0x…<small>Contract-keyed markets</small></b><b>5m<small>ARC market timeframe</small></b></div>
        </div>
        <div className="hm-address-visual">
          <div className="hm-address-top"><span className="hm-token-mark large">{peachTokens[0]?.symbol.slice(0, 2) || "AR"}</span><div><b>{peachTokens[0]?.symbol || "ARC"}</b><small>{peachTokens[0]?.name || "ARC market"}</small></div><em>{peachTokens.length ? "LIVE" : "WAITING"}</em></div>
          <div className="hm-address-code"><small>TOKEN CONTRACT</small><code>{peachTokens[0]?.address || "Awaiting Market feed"}</code></div>
          <div className="hm-address-route"><span>ARC</span><i /><b>ARC MARKETS</b><i /><span>{peachTokens[0]?.symbol || "TOKEN"}</span></div>
          <div className="hm-address-meta"><span><small>NETWORK</small>ARC Mainnet</span><span><small>CHAIN ID</small>5042</span><span><small>PRICE</small>USD</span></div>
        </div>
      </section>

      <section ref={ref_feature} className="feature-section reveal">
        <div className="hm-section-heading"><span className="hm-section-label">THE WORKSPACE</span><h2>Less switching.<br />More context.</h2><p>Everything on the page exists to help you identify a market, inspect it, and prepare the next action.</p></div>
        <div className="feature-grid">{featureCards.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={19} /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section ref={ref_execution} className="home-split execution-section reveal">
        <div className="home-section-copy">
          <span className="hm-section-label">MARKET PREVIEW</span>
          <h2>Know the market<br />before you trade.</h2>
          <p>Check the token address, quote asset, reference price, and ARC network in one place. This preview does not submit transactions.</p>
          <ol className="hm-steps"><li><b>01</b><span>Select a ARC-listed token by address.</span></li><li><b>02</b><span>Check its USD market data.</span></li><li><b>03</b><span>Open its detail page for more context.</span></li></ol>
          <Link href="/markets/spot">Browse ARC markets <ArrowRight size={14} /></Link>
        </div>
        <ExecutionPanel tokens={peachTokens} />
      </section>

      <section ref={ref_unified} className="unified-section reveal">
        <div className="hm-section-heading split"><div><span className="hm-section-label">ONE DIRECTORY</span><h2>ARC tokens.<br />One market view.</h2></div><p>Keep the token identity and ARC market data together as you move through the interface.</p></div>
        <div className="unified-diagram">
          <div className="source-stack">{["USDC", "ARGUS", "WETH", "cirBTC", "EURC"].map((asset) => <span key={asset}><i>{asset.slice(0, 1)}</i>{asset}<small>Quote asset</small></span>)}</div>
          <div className="hm-connector"><i /><i /><i /><i /><i /></div>
          <div className="flow-node"><span>A</span><b>ARTERY</b><small>MARKET INDEX</small></div>
          <div className="hm-connector right"><i /><i /><i /></div>
          <div className="balance-card"><small>SELECTED MARKET</small><b>BANKARC / USDC</b><span>ARC Mainnet · Uniswap V4</span><Link href="/markets/spot">Open directory <ArrowRight size={13} /></Link></div>
        </div>
      </section>

      <section ref={ref_build} className="build-section reveal">
        <div className="hm-section-heading"><span className="hm-section-label">BUILD ON ARTERY</span><h2>Use the same market model.</h2></div>
        <div><Link href="/docs/developer-docs"><Braces size={20} /><b>Developer docs</b><p>ARC configuration, market identity, and routing architecture.</p><span>Read docs <ArrowRight size={13} /></span></Link><Link href="/docs/sdk"><Blocks size={20} /><b>SDK guide</b><p>Typed helpers for tokens, quotes, and wallet-aware interfaces.</p><span>View SDK <ArrowRight size={13} /></span></Link><Link href="/docs/api"><Radio size={20} /><b>API reference</b><p>Market board, token metadata, pagination, and response fields.</p><span>View API <ArrowRight size={13} /></span></Link></div>
      </section>

      <section ref={ref_faq} className="faq-section reveal">
        <div><span className="hm-section-label">QUESTIONS</span><h2>Before you<br />open a market.</h2><p>Short answers about the data, routes, and wallet model.</p><Link href="/docs/user-docs/start">Read documentation <ArrowRight size={14} /></Link></div>
        <div>{faq.map(([question, answer], index) => <article key={question}><button onClick={() => setOpen(open === index ? null : index)}><span>{String(index + 1).padStart(2, "0")}</span>{question}<b>{open === index ? "−" : "+"}</b></button>{open === index && <p>{answer}</p>}</article>)}</div>
      </section>

      <section className="prefooter"><span className="hm-section-label">ARC MARKETS START HERE</span><h2>Find the contract.<br />Open the pair.</h2><p>Browse the ARC market directory built for ARC.</p><div><Link className="home-cta primary" href="/markets/spot">Explore markets <ArrowRight size={15} /></Link><Link className="home-cta" href="/connect">Connect wallet</Link></div></section>
    <Footer />
    </main>
  );
}
