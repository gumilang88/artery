import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/trade-history.js';

const owner = '0xaece0ab2a46f31209f4c6381f20a5af218fda176';
const token = '0x8faae5592b9acc27a79fca745c6b872adf514a5d';
const usdc = '0x3600000000000000000000000000000000000000';
const router = '0xe08cab0828a67291ec4af1fb3e7f867e206a6bda';
const hash = '0xc78796e65baa11e5d5da8b3f275ee7db4c872a81f78c57789f334d67450b93c0';
const transfer = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const pad = value => `0x${value.slice(2).padStart(64, '0')}`;
const log = (asset, from, to, raw) => ({ address: asset, topics: [transfer, pad(from), pad(to)], data: `0x${BigInt(raw).toString(16)}`, transactionHash: hash, blockNumber: '0x16fb0cf' });
const request = new Request(`https://artery.test/api/trade-history/?owner=${owner}&token=${token}`);

test('one rate-limited scan window retains verified trades and reports partial coverage', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_, init) => {
    const { method, params } = JSON.parse(init.body);
    let result;
    if (method === 'eth_blockNumber') result = '0x16fc8af';
    else if (method === 'eth_getLogs') {
      if (Number(params[0].toBlock) === 0x16fc8af) return new Response(JSON.stringify({ error: { code: -32005, message: 'rate limit exceeded' } }), { status: 429 });
      result = params[0].topics[1] === pad(owner) ? [log(usdc, owner, router, 10000)] : [];
    } else if (method === 'eth_getTransactionByHash') result = { hash, from: owner, to: router };
    else if (method === 'eth_getTransactionReceipt') result = { status: '0x1', blockNumber: '0x16fb0cf', logs: [log(usdc, owner, router, 10000), log(token, router, owner, '152424562186240613990')] };
    else if (method === 'eth_getBlockByNumber') result = { timestamp: '0x6ac15277' };
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }));
  };
  try {
    const response = await onRequest({ request });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.trades[0].tx, hash);
    assert.equal(data.partial, true);
    assert.ok(data.scannedWindows < data.requestedWindows);
  } finally { globalThis.fetch = original; }
});
