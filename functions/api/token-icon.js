const HOST = "white-absolute-anglerfish-566.mypinata.cloud";

export async function onRequest({ request }) {
  const cid = new URL(request.url).searchParams.get("cid") || "";
  if (!/^baf[a-z2-7]{20,120}$/.test(cid)) return new Response(null, { status: 400 });
  try {
    const upstream = await fetch(`https://${HOST}/ipfs/${cid}`, { signal: AbortSignal.timeout(9000) });
    if (!upstream.ok) return new Response(null, { status: 404 });
    const mime = (upstream.headers.get("content-type") || "").split(";")[0];
    if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(mime)) return new Response(null, { status: 415 });
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > 2000000) return new Response(null, { status: 413 });
    return new Response(bytes, { headers: { "content-type": mime, "cache-control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch { return new Response(null, { status: 502 }); }
}
