import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePastedSaleAmounts, estimateConfirmedSales, parseUsdCadRate } from '../lib/pricing';
import { ebayQuery } from '../lib/matching';

test('pasted money preserves currency and skips shipping and unsupported currencies', () => {
  const result = parsePastedSaleAmounts('PSA 10 #201\nSold: US $1,000.00\nShipping: $5.00\n$6.00 shipping\nCAD $100.00\nEUR 20.00\nHK$15.00', 'USD');
  assert.deepEqual(result.amounts.map(({ amount, currency }) => ({ amount, currency })), [{ amount: 1000, currency: 'USD' }, { amount: 100, currency: 'CAD' }]);
  assert.equal(result.skipped, 4);
  assert.throws(() => parsePastedSaleAmounts('PSA 10 #201\n2023 Upper Deck', 'USD'));
  assert.throws(() => parsePastedSaleAmounts('USD $25 CAD', 'USD'));
});
test('bare prices use the selected currency; only confirmed records are valued', () => {
  const result = parsePastedSaleAmounts('20\n$30 USD\nC$40\nAsking price: $500', 'CAD');
  assert.deepEqual(result.amounts.map(({ currency }) => currency), ['CAD', 'USD', 'CAD', 'CAD']);
  assert.deepEqual(estimateConfirmedSales(result.amounts.slice(0, 3), 1.4), { estimateCad: 40, sampleCount: 3, low: 20, high: 42 });
  assert.throws(() => estimateConfirmedSales([], 1.4));
  assert.throws(() => estimateConfirmedSales([result.amounts[1]]));
  assert.throws(() => parsePastedSaleAmounts('x'.repeat(30001), 'USD'));
});
test('exchange rates must be positive, dated, and recent', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  const data = (date: string, rate: string) => ({ observations: [{ d: date, FXUSDCAD: { v: rate } }] });
  assert.deepEqual(parseUsdCadRate(data('2026-10-01', '1.4243'), now), { rate: 1.4243, date: '2026-10-01' });
  for (const item of [data('2026-09-01', '1.4'), data('2026-10-10', '1.4'), data('2026-10-01', '0'), data('not a date', '1.4')]) assert.throws(() => parseUsdCadRate(item, now));
});
test('lookup search includes grading alongside card identity', () => {
  assert.equal(ebayQuery({ player: 'Connor McDavid', year: '2015-16', cardNumber: '201', gradingCompany: 'PSA', grade: '9' }), '2015-16 Connor McDavid #201 PSA 9');
});
