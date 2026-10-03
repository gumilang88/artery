import test from 'node:test';
import assert from 'node:assert/strict';

const { classifyOrders, orderRows } = await import('../src/lib/accountOrders.mjs');
const maker = '0xaecE0ab2A46F31209f4C6381f20A5Af218fDA176';
const usdc = '0x3600000000000000000000000000000000000000';
const token = '0x8faae5592b9acc27a79fca745c6b872adf514a5d';
const mk = (hash, asset=usdc, rest='100000') => ({orderHash:hash, createDateTime:'2026-10-03T14:00:00Z', remainingMakerAmount:rest, data:{maker, makerAsset:asset, takerAsset:asset===usdc?token:usdc, makingAmount:'100000', takingAmount:'2000000000000000000000'}});

test('classifies only valid remaining wallet orders; never treats open orders as history', () => {
  const result=classifyOrders([mk('0x'+'1'.repeat(64)),mk('0x'+'2'.repeat(64),usdc,'0'), {...mk('0x'+'3'.repeat(64)),data:{...mk('x').data,maker:'0x0000000000000000000000000000000000000001'}}],maker);
  assert.equal(result.length,1);
  assert.equal(result[0].orderHash,'0x'+'1'.repeat(64));
});

test('maps buy and sell values with exact token decimals and labels', () => {
  const [buy,sell] = orderRows([mk('0x'+'1'.repeat(64)),mk('0x'+'2'.repeat(64),token)], [{address:token,symbol:'MURMUR',decimals:18}]);
  assert.equal(buy.side,'BUY'); assert.equal(buy.amount,'2000'); assert.equal(buy.total,'0.1');
  assert.equal(sell.side,'SELL'); assert.equal(sell.amount,'0.0000000000001');
});

test('only wallet maker and requested ARC pair appear in derived rows', () => {
  const extra=mk('0x'+'4'.repeat(64),'0xbef5f6d51cb62b58e6a8f77868681825c6fe21c1');
  const rows=orderRows(classifyOrders([mk('0x'+'1'.repeat(64)),extra],maker),[{address:token,symbol:'MURMUR',decimals:18}],token);
  assert.equal(rows.length,1);
});
