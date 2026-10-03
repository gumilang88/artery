const RPCS = ["https://rpc.mainnet.arc.io", "https://arc-rpc.publicnode.com", "https://arc.drpc.org"];
const USDC = "0x3600000000000000000000000000000000000000";
const ROUTER = "0xe08cab0828a67291ec4af1fb3e7f867e206a6bda";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const headers = { "content-type": "application/json", "cache-control": "no-store" };
const validAddress = value => /^0x[0-9a-fA-F]{40}$/.test(value);
const validHash = value => /^0x[0-9a-fA-F]{64}$/.test(value);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function rpc(method, params) {
  let error;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const endpoint of RPCS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: AbortSignal.timeout(9000),
        });
        const payload = await response.json();
        if (!response.ok || payload.error) throw Error(payload.error?.message || `RPC ${response.status}`);
        if (payload.result === undefined) throw Error("Invalid RPC response");
        return payload.result;
      } catch (cause) { error = cause; }
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  throw error || Error("ARC RPC unavailable");
}

const addressTopic = address => `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
function amountFromLogs(logs, token, owner, direction) {
  const normalized = owner.toLowerCase();
  return logs.reduce((sum, log) => {
    if (String(log.address).toLowerCase() !== token || String(log.topics?.[0]).toLowerCase() !== TRANSFER || log.topics.length < 3) return sum;
    const from = `0x${log.topics[1].slice(-40).toLowerCase()}`;
    const to = `0x${log.topics[2].slice(-40).toLowerCase()}`;
    if (direction === "in" && to === normalized && from !== normalized) return sum + BigInt(log.data);
    if (direction === "out" && from === normalized && to !== normalized) return sum + BigInt(log.data);
    return sum;
  }, BigInt(0));
}

async function describe(hash, owner, token, knownBlock) {
  const [tx, receipt] = await Promise.all([rpc("eth_getTransactionByHash", [hash]), rpc("eth_getTransactionReceipt", [hash])]);
  if (!tx || !receipt || String(tx.from).toLowerCase() !== owner || String(tx.to).toLowerCase() !== ROUTER || receipt.status !== "0x1") return null;
  const logs = Array.isArray(receipt.logs) ? receipt.logs : [];
  const usdcOut = amountFromLogs(logs, USDC, owner, "out");
  const usdcIn = amountFromLogs(logs, USDC, owner, "in");
  const tokenOut = amountFromLogs(logs, token, owner, "out");
  const tokenIn = amountFromLogs(logs, token, owner, "in");
  const buy = usdcOut > BigInt(0) && tokenIn > BigInt(0);
  const sell = tokenOut > BigInt(0) && usdcIn > BigInt(0);
  if (!buy && !sell) return null;
  const blockNumber = receipt.blockNumber || knownBlock;
  const block = await rpc("eth_getBlockByNumber", [blockNumber, false]);
  return {
    tx: hash,
    at: block?.timestamp ? new Date(Number(BigInt(block.timestamp)) * 1000).toISOString() : null,
    side: buy ? "buy" : "sell",
    token,
    usdcRaw: String(buy ? usdcOut : usdcIn),
    tokenRaw: String(buy ? tokenIn : tokenOut),
    status: "confirmed",
    blockNumber: Number(BigInt(blockNumber)),
  };
}

export async function onRequest({ request }) {
  const query = new URL(request.url).searchParams;
  const owner = (query.get("owner") || "").toLowerCase();
  const token = (query.get("token") || "").toLowerCase();
  if (!validAddress(owner) || !validAddress(token) || token === USDC) return json({ error: "Invalid wallet or token" }, 400);

  try {
    const latest = Number(BigInt(await rpc("eth_blockNumber", [])));
    const start = Math.max(0, latest - 16000);
    const hashes = new Map();
    const fromTopic = addressTopic(owner);
    const windows = [];
    for (let end = latest; end > start; end -= 4000) windows.push({ fromBlock: `0x${Math.max(start + 1, end - 3999).toString(16)}`, toBlock: `0x${end.toString(16)}` });
    let scannedWindows = 0;
    let partial = false;
    for (const window of windows) {
      let windowComplete = true;
      for (const topics of [[TRANSFER, fromTopic], [TRANSFER, null, fromTopic]]) {
        try {
          const logs = await rpc("eth_getLogs", [{ ...window, address: [USDC, token], topics }]);
          for (const log of logs) if (validHash(log.transactionHash)) hashes.set(log.transactionHash.toLowerCase(), log.blockNumber);
        } catch { windowComplete = false; partial = true; }
      }
      if (windowComplete) scannedWindows++;
    }
    if (!scannedWindows && !hashes.size) throw Error("All ARC log scans failed");
    const candidates = [...hashes.entries()].sort((a, b) => Number(BigInt(b[1])) - Number(BigInt(a[1]))).slice(0, 80);
    const trades = [];
    for (let i = 0; i < candidates.length; i += 5) {
      const batch = await Promise.all(candidates.slice(i, i + 5).map(async ([hash, block]) => describe(hash, owner, token, block).catch(() => null)));
      trades.push(...batch.filter(Boolean));
      if (trades.length >= 30) break;
    }
    trades.sort((a, b) => b.blockNumber - a.blockNumber);
    return json({ trades: trades.slice(0, 30), scannedFromBlock: start, scannedToBlock: latest, scannedWindows, requestedWindows: windows.length, partial, complete: false, source: "ARC RPC" });
  } catch (error) {
    return json({ error: "ARC trade history temporarily unavailable", detail: error instanceof Error ? error.message : "RPC failed" }, 502);
  }
}
