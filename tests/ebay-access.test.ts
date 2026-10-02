import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEbayAccess } from '../lib/ebay-access';
test('invalid eBay credentials stop before any search and never expose tokens', async () => {
  let calls = 0;
  const result = await checkEbayAccess('private-id', 'private-secret', (async () => { calls++; return Response.json({ error: 'invalid_client' }, { status: 401 }); }) as typeof fetch);
  assert.deepEqual(result, { oauth: { ok: false, status: 401, code: 'invalid_client' }, browse: null, sold: null });
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(result).includes('private-'));
});
test('working Browse access is distinguished from rejected historical-sales access', async () => {
  const results = [Response.json({ access_token: 'never-return-this' }), Response.json({ itemSummaries: [] }), Response.json({ error: 'invalid_scope' }, { status: 400 })];
  const result = await checkEbayAccess('id', 'secret', (async () => results.shift()!) as typeof fetch);
  assert.equal(result.browse?.ok, true);
  assert.equal(result.sold?.ok, false);
  assert.equal(result.sold?.code, 'invalid_scope');
  assert.ok(!JSON.stringify(result).includes('never-return-this'));
});
