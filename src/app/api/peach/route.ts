import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = new URL("https://api.peach.ag/arc/v1/arc/pro/v2/coin_list");
    Object.entries({ tag: "trending", date_type: "24h", limit: "100", offset: "0", sort_field: "rank", desc: "false" })
      .forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) return NextResponse.json({ error: `Peach upstream ${response.status}` }, { status: 502 });
    const payload = await response.json();
    if (payload?.code !== 0 || !Array.isArray(payload?.data?.coin_list)) throw new Error("Invalid Peach feed");
    const tokens = payload.data.coin_list.filter((item: { address?: string; chainId?: number }) => item.chainId === 5042 && /^0x[a-fA-F0-9]{40}$/.test(item.address || ""));
    return NextResponse.json({ tokens, receivedAt: Date.now() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Peach feed unavailable" }, { status: 502 });
  }
}
