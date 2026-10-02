import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCollectionPdf, collectionPdfGroups } from '../lib/collection-pdf';
import { emptyCard } from '../lib/defaults';

test('collection PDF groups and sorts saved inventory without creating missing cards', () => {
  const base = { ...emptyCard(), player: 'Nick Suzuki', year: '2021-22', brand: 'Upper Deck', set: 'MVP', cardNumber: '87' };
  const cards = [{ ...base, cardNumber: '100' }, { ...base, cardNumber: '2', set: 'MVP Hockey', parallel: 'Silver Script' }, base, { ...base, sport: 'Baseball' as const, brand: 'Topps', set: 'Chrome' }];
  const groups = collectionPdfGroups(cards);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.find(group => group.sport === 'Hockey')!.cards.map(card => card.cardNumber), ['2', '87', '100']);
  assert.equal(groups.reduce((sum, group) => sum + group.cards.length, 0), cards.length);
  assert.equal(cards[0].cardNumber, '100');
});
test('PDF pagination keeps every checkbox and supports Letter and A4', () => {
  const cards = Array.from({ length: 130 }, (_, i) => ({ ...emptyCard(), player: `Player ${i}`, year: '2021-22', brand: 'Upper Deck', set: 'MVP', cardNumber: String(i + 1), quantity: 2 }));
  for (const paper of ['letter', 'a4'] as const) {
    const pdf = createCollectionPdf(cards, { paper, includeValues: true, scope: 'All cards' });
    assert.ok(pdf.getNumberOfPages() > 1);
    const source = pdf.output();
    assert.equal((source.match(/\/FT \/Btn/g) || []).length, cards.length);
    assert.match(source, /%PDF/);
    assert.ok(Math.abs(pdf.internal.pageSize.getWidth() - (paper === 'letter' ? 612 : 595.28)) < 0.1);
  }
  assert.throws(() => createCollectionPdf([], { paper: 'letter', includeValues: false, scope: 'Filtered cards' }), /no cards/);
});
