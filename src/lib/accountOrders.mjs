const USDC = '0x3600000000000000000000000000000000000000';

export function classifyOrders(rows, maker) {
  return (Array.isArray(rows) ? rows : []).filter(row =>
    row?.data?.maker?.toLowerCase() === maker.toLowerCase() &&
    /^0x[0-9a-fA-F]{64}$/.test(row.orderHash || '') &&
    /^\d+$/.test(String(row.remainingMakerAmount || '')) &&
    BigInt(row.remainingMakerAmount) > BigInt(0)
  );
}

export function formatUnits(raw, decimals) {
  if (!/^\d+$/.test(String(raw)) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return '—';
  const s = String(raw).padStart(decimals + 1, '0');
  if (!decimals) return s;
  return `${s.slice(0, -decimals)}.${s.slice(-decimals)}`.replace(/\.?0+$/, '') || '0';
}

export function orderRows(rows, tokens, selectedAddress) {
  const tokenByAddress = new Map((tokens || []).map(t => [t.address.toLowerCase(), t]));
  return (rows || []).flatMap(row => {
    const makerAsset = row.data.makerAsset.toLowerCase();
    const takerAsset = row.data.takerAsset.toLowerCase();
    const buy = makerAsset === USDC;
    const sell = takerAsset === USDC;
    if (!buy && !sell) return [];
    const tokenAddr = buy ? takerAsset : makerAsset;
    if (selectedAddress && tokenAddr !== selectedAddress.toLowerCase()) return [];
    const token = tokenByAddress.get(tokenAddr);
    const decimals = token?.decimals ?? 18;
    const tokenRaw = buy ? row.data.takingAmount : row.data.makingAmount;
    const usdcRaw = buy ? row.data.makingAmount : row.data.takingAmount;
    const tokenAmount = formatUnits(tokenRaw, decimals);
    const total = formatUnits(usdcRaw, 6);
    const price = Number(tokenAmount) > 0 ? (Number(total) / Number(tokenAmount)).toLocaleString('en-US', { maximumSignificantDigits: 6, useGrouping: false }) : '—';
    return [{ orderHash: row.orderHash, at: row.createDateTime, symbol: token?.symbol || `${tokenAddr.slice(0, 6)}…${tokenAddr.slice(-4)}`, side: buy ? 'BUY' : 'SELL', amount: tokenAmount, total, price, status: 'OPEN' }];
  });
}
