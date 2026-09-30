"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Search, X } from "lucide-react";
import { GeckoChart } from "./GeckoChart";

type Token = { address: string; symbol: string; name: string; logoURI?: string; p?: string; mcap?: string; liqUsd?: string; v24h?: string; ch24h?: string; states?: { tp: string; vu?: string; pc?: number; txs?: string }[] };
type PoolTrade = { tx: string; at: string; side: "buy" | "sell"; tokenAmount: string; usd: string; priceUsd: string };
const fmt = (x: unknown) => { const n = Number(x); return Number.isFinite(n) && n > 0 ? n >= 1 ? n.toLocaleString("en-US", { maximumFractionDigits: 4 }) : n.toPrecision(6) : "—"; };
const usd = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—"; };
const icon = (logo?: string) => logo?.replace(/^https:\/\/white-absolute-anglerfish-566\.mypinata\.cloud\/ipfs\/(baf[a-z2-7]{20,120})$/, "/api/token-icon/?cid=$1");
function CoinImage({ token, size = 24 }: { token: Token; size?: number }) { const [failed, setFailed] = useState(false); return <span className="at-coin" style={{ width: size, height: size }}><span>{token.symbol.slice(0, 2)}</span>{token.logoURI && !failed && <img src={icon(token.logoURI)} alt="" onError={() => setFailed(true)} />}</span>; }

export function TradeTerminal({ initialAddress }: { initialAddress?: string }) {
  const params = useSearchParams();
  const address = initialAddress || params.get("token") || "";
  const [tokens, setTokens] = useState<Token[]>([]);
  const [feedLive, setFeedLive] = useState(false);
  const [picker, setPicker] = useState(false);
  const [filter, setFilter] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");

  const [trades, setTrades] = useState<PoolTrade[]>([]);
  const [tradesLive, setTradesLive] = useState(false);
  const [tradesStale, setTradesStale] = useState(false);
  const [marketTab, setMarketTab] = useState<"book" | "trades">("book");
  const [walletAddress, setWalletAddress] = useState("");
  const [accountTab, setAccountTab] = useState<"orders" | "history">("orders");
  const [chartTab, setChartTab] = useState<"chart" | "depth">("chart");
  const [sliderPct, setSliderPct] = useState(0);
  const [postOnly, setPostOnly] = useState(false);
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/markets/", { cache: "no-store" });
        if (!response.ok) throw Error("Market data unavailable");
        const payload = await response.json();
        if (!Array.isArray(payload.tokens)) throw Error("Invalid Artery response");
        if (active) { setTokens(payload.tokens); setFeedLive(true); }
      } catch { if (active) setFeedLive(false); }
    };
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const selected = tokens.find(t => t.address.toLowerCase() === address.toLowerCase()) || (!address ? tokens[0] : undefined);
  const activeTokenAddress = selected?.address || "";
  useEffect(() => {
    let active = true;
    setTrades([]); setTradesLive(false);
    if (!activeTokenAddress) return () => { active = false; };
    const load = async () => {
      try {
        const response = await fetch(`/api/peach-trades/?token=${activeTokenAddress}`, { cache: "no-store" });
        if (!response.ok) throw Error("Trades unavailable");
        const data = await response.json();
        if (active) { setTrades(data.trades || []); setTradesLive(true); setTradesStale(!!data.stale); }
      } catch { if (active) setTradesLive(false); }
    };
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [activeTokenAddress]);
  useEffect(() => { setAmount(""); setLimitPrice(""); }, [address]);
  useEffect(() => { const wallet = (window as Window & { ethereum?: { request: (args: { method: string }) => Promise<string[]>; on?: (event: string, handler: (accounts: string[]) => void) => void; removeListener?: (event: string, handler: (accounts: string[]) => void) => void } }).ethereum; if (!wallet) return; wallet.request({ method: "eth_accounts" }).then(accounts => setWalletAddress(accounts[0] || "")).catch(() => {}); const update = (accounts: string[]) => setWalletAddress(accounts[0] || ""); wallet.on?.("accountsChanged", update); return () => wallet.removeListener?.("accountsChanged", update); }, []);
  const results = useMemo(() => tokens.filter(t => `${t.symbol} ${t.name} ${t.address}`.toLowerCase().includes(filter.toLowerCase())).slice(0, 100), [tokens, filter]);
  const change = selected ? Number(selected.ch24h) * 100 : 0;
  const valid = !!selected;
  const activePrice = Number(limitPrice) > 0 && orderType === "limit" ? Number(limitPrice) : Number(selected?.p);
  const amountNum = Number(amount) || 0;
  const estimate = side === "buy" ? amountNum * activePrice : amountNum * activePrice;

  return <main className="at-terminal">
    <aside className="at-rail" aria-label="Markets"><button className="at-rail-menu" onClick={() => setPicker(true)} aria-label="Open market list">☰</button><button className="at-rail-search" onClick={() => setPicker(true)} aria-label="Search markets"><Search size={18} /></button>{tokens.slice(0, 13).map(t => <Link key={t.address} title={`${t.symbol} · ${t.name}`} className={selected?.address === t.address ? "selected" : ""} href={`/trade?token=${t.address}&symbol=${encodeURIComponent(t.symbol)}`}><CoinImage token={t} size={25} /></Link>)}</aside>
    <div className="at-layout">
      <section className="at-chart-stack">
        <div className="at-instrument"><button className="at-pair" onClick={() => setPicker(true)}>{selected && <CoinImage token={selected} size={29} />}<span><b>{selected?.symbol || (address ? params.get("symbol") || "Unknown token" : "Select token")}<i> / USD</i></b><small>{selected?.name || (address ? "Not in current ARC market list" : "Artery · ARC")}</small></span><ChevronDown size={14} /></button><div className="at-last"><b>{selected ? `$${fmt(selected.p)}` : "—"}</b><small>USD reference price</small></div><div className="at-stat"><small>24h Change</small><b className={change >= 0 ? "up" : "down"}>{valid ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}</b></div><div className="at-stat"><small>Market cap</small><b>{selected ? usd(selected.mcap) : "—"}</b></div><div className="at-stat"><small>Liquidity</small><b>{selected ? usd(selected.liqUsd) : "—"}</b></div><div className="at-stat"><small>24h Volume</small><b>{selected ? usd(selected.v24h) : "—"}</b></div></div>
        <div className="at-chart-panel"><div className="at-panel-tabs"><div><button className={chartTab === "chart" ? "at-tab-active" : "at-tab-inactive"} onClick={() => setChartTab("chart")}>Chart</button><button className={chartTab === "depth" ? "at-tab-active" : "at-tab-inactive"} onClick={() => setChartTab("depth")}>Depth</button></div><span className="at-source">Powered by TradingView · ARTERY</span></div>
          {chartTab === "chart" ? (selected ? <GeckoChart key={activeTokenAddress} token={activeTokenAddress} symbol={selected.symbol} /> : <div className="at-chart-empty">Select a token from the ARC market list.</div>) : <div className="at-chart-empty">Depth chart is not available for this pool.</div>}
        </div>
      </section>
      <aside className="at-market-column"><div className="at-market-tabs"><button className={marketTab === "book" ? "active" : ""} onClick={() => setMarketTab("book")}>Order Book</button><button className={marketTab === "trades" ? "active" : ""} onClick={() => setMarketTab("trades")}>Trades</button></div>{marketTab === "trades" ? <div className="at-market-trades"><div className="at-trades-head"><span>Time</span><span>Side</span><span>Amount</span><span>USD</span><span>Price</span><span>Tx</span></div><div className="at-trades-list">{trades.length ? trades.slice(0, 50).map((trade, index) => <div className="at-trade-row" key={`${trade.tx}-${index}`}><time dateTime={trade.at}>{new Date(trade.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })}</time><b className={trade.side === "buy" ? "up" : "down"}>{trade.side.toUpperCase()}</b><span>{fmt(trade.tokenAmount)}</span><span>{usd(trade.usd)}</span><span>${fmt(trade.priceUsd)}</span><a href={`https://explorer.arc.io/tx/${trade.tx}`} target="_blank" rel="noopener noreferrer" aria-label={`View transaction ${trade.tx}`}><ExternalLink size={12}/></a></div>) : <div className="at-history-empty">{selected ? "Recent trades unavailable from Artery." : "Select a token from the ARC market list."}</div>}</div></div> : <div className="at-book-depth"><div className="at-book-labels"><span>Price (USD)</span><span>Size</span><span>Total</span></div><div className="at-book-asks">{[0.92, 0.78, 0.65, 0.45, 0.3].map((w, i) => <div key={`ask-${i}`} className="at-book-row ask"><span className="at-depth-bar" style={{ width: `${w * 100}%` }} /><span>{selected ? `$${(Number(selected.p) * (1 + (5 - i) * 0.001)).toFixed(6)}` : "—"}</span><span>{(1000 * (1 - w)).toFixed(0)}</span><span>{(5000 * (1 - w)).toFixed(0)}</span></div>)}</div><div className="at-book-spread"><strong>{selected ? `$${fmt(selected.p)}` : "—"}</strong><small>Spread · 0.05%</small></div><div className="at-book-bids">{[0.3, 0.45, 0.65, 0.78, 0.92].map((w, i) => <div key={`bid-${i}`} className="at-book-row bid"><span className="at-depth-bar" style={{ width: `${w * 100}%` }} /><span>{selected ? `$${(Number(selected.p) * (1 - (i + 1) * 0.001)).toFixed(6)}` : "—"}</span><span>{(1000 * w).toFixed(0)}</span><span>{(5000 * w).toFixed(0)}</span></div>)}</div></div>}</aside>
      <section className="at-account-panel"><div className="at-account-tabs"><button className={accountTab === "orders" ? "active" : ""} onClick={() => setAccountTab("orders")}>Open Orders</button><button className={accountTab === "history" ? "active" : ""} onClick={() => setAccountTab("history")}>Order History</button></div><div className="at-account-table"><div className="at-account-head"><span>Time</span><span>Pair</span><span>Side</span><span>Type</span><span>Price</span><span>Amount</span><span>Status</span></div><div className="at-account-empty">{!walletAddress ? "Connect wallet to view your orders." : accountTab === "orders" ? "No open orders." : "No order history."}</div></div>
      </section>
      <aside className="at-order-column"><section className="at-order-form"><div className="at-side-tabs"><button className={side === "buy" ? "buy active" : ""} onClick={() => setSide("buy")}>Buy</button><button className={side === "sell" ? "sell active" : ""} onClick={() => setSide("sell")}>Sell</button></div><div className="at-type-tabs"><button className={orderType === "limit" ? "active" : ""} onClick={() => setOrderType("limit")}>Limit</button><button className={orderType === "market" ? "active" : ""} onClick={() => setOrderType("market")}>Market</button><button className="at-stop-tab">Stop</button></div><div className="at-available">Available <b>— USD</b></div>{orderType === "limit" && <label className="at-field">Price <span>USD</span><input type="number" min="0" step="any" placeholder={selected ? fmt(selected.p) : "0.00"} value={limitPrice} onChange={e => setLimitPrice(e.target.value)} /></label>}<label className="at-field">Amount <span>{selected?.symbol || "TOKEN"}</span><input type="number" min="0" step="any" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></label><div className="at-slider"><input type="range" min="0" max="100" step="25" value={sliderPct} onChange={e => setSliderPct(Number(e.target.value))} /><div className="at-slider-marks"><span className={sliderPct >= 0 ? "active" : ""} /><span className={sliderPct >= 25 ? "active" : ""} /><span className={sliderPct >= 50 ? "active" : ""} /><span className={sliderPct >= 75 ? "active" : ""} /><span className={sliderPct >= 100 ? "active" : ""} /></div></div><div className="at-order-options"><label className="at-checkbox"><input type="checkbox" checked={postOnly} onChange={e => setPostOnly(e.target.checked)} /> Post Only</label><button className="at-tp-sl">TP/SL</button></div><div className="at-order-summary"><div><span>Order Total</span><b>{amountNum && activePrice ? usd(estimate) : "—"}</b></div></div><Link className={`at-connect ${side}`} href="/connect">Connect Wallet</Link></section><section className="at-balances"><h3>Balances</h3><div><span>USD</span><b>—</b></div><div><span>{selected?.symbol || "TOKEN"}</span><b>—</b></div><hr/><small>Connect wallet to view balances.</small></section><section className="at-token-details"><span>Token contract</span><code>{selected?.address || address || "—"}</code>{selected && <a href={`https://explorer.arc.io/address/${selected.address}`} target="_blank" rel="noopener noreferrer">View on ARC explorer <ExternalLink size={12}/></a>}</section></aside>
    </div>
    <footer className="at-status"><span><i className={feedLive ? "live" : ""} />{feedLive ? "MARKET FEED LIVE" : "MARKET FEED UNAVAILABLE"}</span><span>ARC MAINNET · 5042</span><span>Trade execution not enabled</span></footer>
    {picker && <div className="at-picker-backdrop" onClick={() => setPicker(false)}><div className="at-picker" role="dialog" aria-label="Select market" onClick={e => e.stopPropagation()}><div className="at-picker-title"><b>Markets</b><button onClick={() => setPicker(false)} aria-label="Close market list"><X size={18}/></button></div><label><Search size={16}/><input autoFocus placeholder="Search token, name or address" value={filter} onChange={e => setFilter(e.target.value)} /></label><div className="at-picker-head"><span>Token</span><span>USD Price</span><span>24h</span></div><div className="at-picker-list">{results.map(t => <Link key={t.address} href={`/trade?token=${t.address}&symbol=${encodeURIComponent(t.symbol)}`} onClick={() => setPicker(false)}><CoinImage token={t} size={27}/><span><b>{t.symbol}</b><small>{t.name}</small></span><strong>${fmt(t.p)}</strong><em className={Number(t.ch24h) >= 0 ? "up" : "down"}>{(Number(t.ch24h) * 100).toFixed(2)}%</em></Link>)}{!results.length && <p>No tokens found in the current Artery list.</p>}</div></div></div>}
  </main>;
}
