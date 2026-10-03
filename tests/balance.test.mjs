import test from 'node:test';
import assert from 'node:assert/strict';

const owner = '0xaecE0ab2A46F31209f4C6381f20A5Af218fDA176';
const usdc = '0x3600000000000000000000000000000000000000';
const { onRequest } = await import('../functions/api/balance.js');

const request = (extra = '') => ({ request: new Request(`https://artery.test/api/balance/?token=${usdc}&owner=${owner}${extra}`) });

async function withFetch(fake, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try { await fn(); } finally { globalThis.fetch = original; }
}

const rpcReply = (result) => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), { status: 200 });

test('falls back when primary RPC returns a JSON-RPC error, retaining real balance and decimals', async () => {
  const calls = [];
  await withFetch(async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, data: body.params[0].data });
    if (String(url).includes('rpc.mainnet.arc.io')) return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'upstream rejected' } }), { status: 200 });
    if (body.params[0].data.startsWith('0x70a08231')) return rpcReply('0xb085f');
    if (body.params[0].data === '0x313ce567') return rpcReply('0x6');
    throw new Error('unexpected RPC selector');
  }, async () => {
    const res = await onRequest(request());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { balance: '723039', decimals: 6, allowance: null });
  });
  assert(calls.some(x => String(x.url).includes('arc.drpc.org')));
});

test('fallback works for network failure and allowance is read independently', async () => {
  await withFetch(async (url, init) => {
    if (String(url).includes('rpc.mainnet.arc.io')) throw new Error('network down');
    const data = JSON.parse(init.body).params[0].data;
    if (data.startsWith('0x70a08231')) return rpcReply('0x0');
    if (data.startsWith('0xdd62ed3e')) return rpcReply('0x10');
    if (data === '0x313ce567') return rpcReply('0x6');
    throw new Error('unexpected selector');
  }, async () => {
    const res = await onRequest(request(`&spender=${owner}`));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { balance: '0', decimals: 6, allowance: '16' });
  });
});

test('does not report zero balance when every RPC rejects the read', async () => {
  await withFetch(async () => new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 }), async () => {
    const res = await onRequest(request());
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /balance fetch failed/);
  });
});

test('rejects malformed addresses before any RPC call', async () => {
  await withFetch(async () => { throw new Error('unexpected request'); }, async () => {
    const res = await onRequest({ request: new Request('https://artery.test/api/balance/?token=nope&owner=bad') });
    assert.equal(res.status, 400);
  });
});
