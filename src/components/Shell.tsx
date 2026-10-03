"use client";
import Link from "next/link";
import { Search, Settings, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";

type MarketToken = { address: string; symbol: string; name: string; logoURI?: string };
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [settings, setSettings] = useState(false);
  const wallet = useWallet();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.key === "/" && !(e.target instanceof HTMLInputElement))) { e.preventDefault(); setSearch(true); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!search) return;
    let active = true;
    fetch("/api/peach/", { cache: "no-store" }).then(r => { if (!r.ok) throw Error("Feed unavailable"); return r.json(); }).then(j => { if (active) setTokens(j.tokens || []); }).catch(() => { if (active) setTokens([]); });
    return () => { active = false; };
  }, [search]);
  const close = () => { setSearch(false); setSettings(false); };
  const matches = tokens.filter(t => `${t.name} ${t.symbol} ${t.address}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  return <div className="shell"><header className="header"><Link href="/" className="brand"><img src="/artery-logo-64.png" alt="Artery" width={26} height={26} style={{objectFit:"contain",flexShrink:0}} /><span>artery<span className="network">ARC MAINNET</span></span></Link><nav className="nav"><Link className={path.startsWith("/markets") ? "active" : ""} href="/markets/spot">Markets</Link><Link className={path.startsWith("/trade") ? "active" : ""} href="/trade">Trade</Link><Link className={path.startsWith("/docs") ? "active" : ""} href="/docs/user-docs/start">Docs</Link><Link className={path.startsWith("/tools") ? "active" : ""} href="/tools">Portfolio</Link></nav><span className="header-spacer"/><button className="btn" onClick={() => setSearch(true)}><Search size={14}/> Search <small>/</small></button>{wallet.address ? <div className="wallet-chip"><button className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => { wallet.switchToArc(); }} title="Connected">{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</button><button className="btn" style={{ display: "inline-flex", alignItems: "center" }} onClick={wallet.disconnect} title="Disconnect"><X size={14}/></button></div> : <button className="btn primary" style={{ display: "inline-flex", alignItems: "center" }} onClick={wallet.connect} disabled={wallet.connecting}>{wallet.connecting ? "Connecting…" : "Connect"}</button>}<button className="btn" aria-label="Settings" onClick={() => setSettings(true)}><Settings size={16}/></button></header>{children}{!path.startsWith("/trade") && <footer className="footer">© 2026 Artery · ARC market data via Artery.</footer>}{(search || settings) && <div className="modalback" onClick={close}><div className="modal" onClick={e => e.stopPropagation()}><button className="btn" style={{ float: "right" }} onClick={close}><X size={15}/></button>{search && <><h2>Search ARC markets</h2><input autoFocus className="search" style={{ display: "block", width: "100%" }} placeholder="Token name, symbol or address" value={query} onChange={e => setQuery(e.target.value)}/><div style={{ marginTop: 18, maxHeight: 360, overflowY: "auto" }}>{matches.map(t => <Link key={t.address} href={`/trade?token=${t.address}&symbol=${encodeURIComponent(t.symbol)}`} onClick={close} style={{ display: "flex", gap: 10, padding: 10 }}><b>{t.symbol}</b><span className="muted">{t.name}</span></Link>)}{!matches.length && <p className="muted">No tokens in the current Artery list.</p>}</div></>}{settings && <><h2>Settings</h2><p className="muted">Interface theme</p><button className="btn" onClick={() => document.body.classList.toggle("light")}>Toggle light / dark</button><p className="muted">Network: ARC Mainnet · Chain ID 5042</p></>}</div></div>}</div>;
}
