"use client";
import { Suspense } from "react";
import { TradeTerminal } from "@/components/TradeTerminal";
export default function Page() { return <Suspense fallback={<main className="at-loading">Loading ARC markets…</main>}><TradeTerminal /></Suspense>; }
