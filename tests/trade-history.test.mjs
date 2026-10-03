import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/trade-history.js';

const wallet = '0xaece0ab2a46f31209f4c6381f20a5af218fda176';
const token = '0x8faae5592b9acc27a79fca745c6b872adf514a5d';
const usdc = '0x3600000000000000000000000000000000000000';
const router = '0xe08cab0828a67291ec4af1fb3e7f867e206a6bda';
const hash = '0xc78796e65baa11e5d5da8b3f275ee7db4c872a81f78c57789f334d67450b93c0';
const pad = a => '0x' + a.slice(2).padStart(64, '0');
const topic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const transfer = (asset, from, to, value) => ({ address: asset, topics: [topic, pad(from), pad(to)], data: '0x' + BigInt(value).toString(16), transactionHash: hash, blockNumber: '0x16fb0cf' });
const rpc = (method) => {
  if (method === 'eth_blockNumber') return '0x16fc8af';
  if (method === 'eth_getLogs') return [transfer(usdc, wallet, router, 10000)];
  if (method === 'eth_getTransactionByHash') return { hash, from: wallet, to: router, blockNumber: '0x16fb0cf' };
  if (method === 'eth_getTransactionReceipt') return { status: '0x1', blockNumber: '0x16fb0cf', logs: [transfer(usdc, wallet, router, 10000), transfer(token, router, wallet, '152424562186240613990')] };
  if (method === 'eth_getBlockByNumber') return { timestamp: '0x6ac15277' };
  throw Error(method);
};
const request = (owner = wallet, asset = token) => new Request(`https://artery.test/api/trade-history/?owner=${owner}&token=${asset}`);
const withRpc = async (run, responder = rpc) => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_, init) => {
    const { method, params } = JSON.parse(init.body);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: responder(method, params) }), { headers: { 'content-type': 'application/json' } });
  };
  try { return await run(); } finally { globalThis.fetch = original; }
};

test('finds a confirmed wallet buy by USDC outflow and token inflow, including older blocks', async () => {
  await withRpc(async () => {
    const response = await onRequest({ request: request() });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.trades.length, 1);
    assert.equal(data.trades[0].tx, hash);
    assert.equal(data.trades[0].side, 'buy');
    assert.equal(data.trades[0].usdcRaw, '10000');
    assert.equal(data.trades[0].tokenRaw, '152424562186240613990');
    assert.equal(data.trades[0].status, 'confirmed');
  });
});

test('rejects invalid wallet before touching RPC', async () => {
  const response = await onRequest({ request: request('bad') });
  assert.equal(response.status, 400);
});

test('does not label approvals or unrelated transfers as trades', async () => {
  await withRpc(async () => {
    const response = await onRequest({ request: request() });
    assert.deepEqual((await response.json()).trades, []);
  }, (method) => method === 'eth_blockNumber' ? '0x16fc8af' : method === 'eth_getLogs' ? [transfer(usdc, wallet, router, 10000)] : method === 'eth_getTransactionByHash' ? { from: wallet, to: router } : method === 'eth_getTransactionReceipt' ? { status: '0x1', logs: [] } : { timestamp: '0x6ac15277' });
});

test('reports unavailable when RPC scan fails rather than claiming no trades', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw Error('rpc down'); };
  try {
    const response = await onRequest({ request: request() });
    assert.equal(response.status, 502);
  } finally { globalThis.fetch = original; }
});
