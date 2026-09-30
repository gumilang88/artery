import { NextRequest, NextResponse } from "next/server";

const allowedHost = "white-absolute-anglerfish-566.mypinata.cloud";
export async function GET(request: NextRequest) {
  const cid = request.nextUrl.searchParams.get("cid") || "";
  if (!/^baf[a-z2-7]{20,120}$/.test(cid)) return new NextResponse(null, { status: 400 });
  try {
    const response = await fetch(`https://${allowedHost}/ipfs/${cid}`, { signal: AbortSignal.timeout(9000), next: { revalidate: 3600 } });
    if (!response.ok) return new NextResponse(null, { status: 404 });
    const mime = response.headers.get("content-type")?.split(";")[0] || "";
    if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(mime)) return new NextResponse(null, { status: 415 });
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 2_000_000) return new NextResponse(null, { status: 413 });
    return new NextResponse(bytes, { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch { return new NextResponse(null, { status: 502 }); }
}
