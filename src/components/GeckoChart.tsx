"use client";

import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart, HistogramSeries, type CandlestickData, type HistogramData, type IChartApi, type Time } from "lightweight-charts";

const intervals = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type Candle = [number, number, number, number, number, number];

export function GeckoChart({ token, symbol }: { token: string; symbol: string }) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const priceSeries = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const volumeSeries = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const [interval, setIntervalValue] = useState<(typeof intervals)[number]>("15m");
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const instance = createChart(host.current, {
      width: host.current.clientWidth, height: host.current.clientHeight,
      layout: { background: { color: "#191c21" }, textColor: "#929aa5", fontFamily: "Inter, Arial, sans-serif", fontSize: 11 },
      grid: { vertLines: { color: "#262a30" }, horzLines: { color: "#262a30" } },
      rightPriceScale: { borderColor: "#333941", minimumWidth: 84, scaleMargins: { top: 0.07, bottom: 0.23 } },
      timeScale: { borderColor: "#333941", timeVisible: true, secondsVisible: false, rightOffset: 4 },
      crosshair: { vertLine: { color: "#737c89" }, horzLine: { color: "#737c89" } },
    });
    const candles = instance.addSeries(CandlestickSeries, { upColor: "#42cda2", downColor: "#ee7080", borderVisible: false, wickUpColor: "#42cda2", wickDownColor: "#ee7080", priceFormat: { type: "price", precision: 8, minMove: 0.00000001 } });
    const volumes = instance.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" });
    volumes.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chart.current = instance; priceSeries.current = candles; volumeSeries.current = volumes;
    const observer = new ResizeObserver(entries => { const rect = entries[0]?.contentRect; if (rect) instance.resize(rect.width, rect.height); });
    observer.observe(host.current);
    return () => { observer.disconnect(); instance.remove(); chart.current = null; priceSeries.current = null; volumeSeries.current = null; };
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    priceSeries.current?.setData([]); volumeSeries.current?.setData([]);
    const load = async () => {
      try {
        const response = await fetch(`/api/peach-chart/?token=${token}&interval=${interval}`, { cache: "no-store" });
        if (!response.ok) throw Error("OHLCV unavailable");
        const payload = await response.json();
        if (!active) return;
        setStale(!!payload.stale);
        const rows: Candle[] = (payload.candles || []).filter((row: unknown): row is Candle => Array.isArray(row) && row.length >= 6 && row.slice(0, 6).every((value: unknown) => typeof value === "number" && Number.isFinite(value)));
        rows.sort((a, b) => a[0] - b[0]);
        const unique = rows.filter((row, index) => index === 0 || row[0] !== rows[index - 1][0]);
        if (!unique.length) { setStatus("empty"); return; }
        const candleData: CandlestickData<Time>[] = unique.map(row => ({ time: row[0] as Time, open: row[1], high: row[2], low: row[3], close: row[4] }));
        const volumeData: HistogramData<Time>[] = unique.map(row => ({ time: row[0] as Time, value: row[5], color: row[4] >= row[1] ? "#42cda255" : "#ee708055" }));
        priceSeries.current?.setData(candleData);
        volumeSeries.current?.setData(volumeData);
        chart.current?.timeScale().fitContent();
        setStatus("ready");
      } catch { if (active) setStatus("error"); }
    };
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, interval]);

  return <div className="at-gecko-native"><div className="at-gecko-controls"><b>{symbol} / USD</b>{intervals.map(value => <button key={value} type="button" className={interval === value ? "active" : ""} onClick={() => setIntervalValue(value)}>{value}</button>)}<span>{stale ? "Cached OHLCV · Artery" : "OHLCV · Artery"}</span></div><div className="at-gecko-canvas" ref={host} />{status !== "ready" && <div className="at-gecko-state">{status === "loading" ? "Loading market candles…" : status === "empty" ? "No candles for this token and interval." : "Market candle feed unavailable."}</div>}</div>;
}
