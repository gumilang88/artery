"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { time: number; value: number };
const STORAGE_KEY = "artery:spot-volume-history:v1";
const MAX_POINTS = 96;
const fmt = (value: number) => value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(2)}M` : value >= 1e3 ? `$${(value / 1e3).toFixed(1)}K` : `$${value.toFixed(0)}`;

export function SpotVolumeChart({ value, live }: { value: number; live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Point[];
      setPoints(parsed.filter(point => Number.isFinite(point.time) && Number.isFinite(point.value) && Date.now() - point.time < 86_400_000).slice(-MAX_POINTS));
    } catch { setPoints([]); }
  }, []);

  useEffect(() => {
    if (!live || !Number.isFinite(value) || value <= 0) return;
    setPoints(previous => {
      const now = Date.now();
      const next = [...previous];
      const last = next[next.length - 1];
      if (last && now - last.time < 10_000) next[next.length - 1] = { time: now, value };
      else next.push({ time: now, value });
      const limited = next.slice(-MAX_POINTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      return limited;
    });
  }, [value, live]);

  const chart = useMemo(() => {
    const source = points.length > 1 ? points : points.length === 1 ? [{ ...points[0], time: points[0].time - 15_000 }, points[0]] : [];
    if (!source.length) return { source, path: "", area: "", coords: [] as { x: number; y: number }[] };
    const values = source.map(point => point.value);
    const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, max * .002, 1);
    const coords = source.map((point, index) => ({ x: source.length === 1 ? 50 : index / (source.length - 1) * 100, y: 76 - ((point.value - min) / span) * 56 }));
    const path = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    return { source, coords, path, area: `${path} L100,82 L0,82 Z` };
  }, [points]);

  const move = (clientX: number) => {
    const rect = host.current?.getBoundingClientRect();
    if (!rect || !chart.source.length) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (chart.source.length - 1)));
  };
  const selected = active == null ? null : chart.source[active];
  const selectedCoord = active == null ? null : chart.coords[active];

  return <div className="am-volume-chart" ref={host} onPointerMove={event => move(event.clientX)} onPointerLeave={() => setActive(null)}>
    <div className="am-volume-chart-head"><span>LIVE SESSION</span><small>{points.length > 1 ? `${points.length} SAMPLES` : "COLLECTING · 15S"}</small></div>
    {chart.source.length ? <svg viewBox="0 0 100 84" preserveAspectRatio="none" aria-label="Live total spot volume history">
      <defs><linearGradient id="amVolumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fa3071" stopOpacity=".3"/><stop offset="1" stopColor="#fa3071" stopOpacity="0"/></linearGradient></defs>
      <path d={chart.area} fill="url(#amVolumeFill)" />
      <path d={chart.path} fill="none" stroke="#fa4b83" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      {selectedCoord && <><line x1={selectedCoord.x} x2={selectedCoord.x} y1="8" y2="82" stroke="#ffffff55" strokeWidth=".7" vectorEffect="non-scaling-stroke"/><circle cx={selectedCoord.x} cy={selectedCoord.y} r="2.3" fill="#fff" stroke="#fa3071" strokeWidth="1.3" vectorEffect="non-scaling-stroke"/></>}
    </svg> : <div className="am-volume-chart-empty">Waiting for live volume…</div>}
    {selected && selectedCoord && <div className="am-volume-tooltip" style={{ left: `${selectedCoord.x}%` }}><b>{fmt(selected.value)}</b><small>{new Date(selected.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div>}
  </div>;
}
