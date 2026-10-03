import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIdentification } from '../lib/ai-identification';
test('identification preserves catalogue fields and excludes unknowns and injected fields', () => {
  const result = parseIdentification({ fields: { player: 'Connor McDavid', set: 'Series One', parallel: 'Young Guns', grade: null, rookie: true, estimatedValueCad: 9999 }, evidence: 'Visible card #201', warnings: ['Year is uncertain'] });
  assert.deepEqual(result.fields, { player: 'Connor McDavid', set: 'Series One', parallel: 'Young Guns', rookie: true });
  assert.equal(result.warnings[0], 'Year is uncertain');
});
test('invalid grading and booleans are rejected rather than applied to form', () => {
  assert.throws(() => parseIdentification({ fields: { gradingCompany: 'invented' } }));
  assert.throws(() => parseIdentification({ fields: { autograph: 'yes' } }));
});

test('uncertain fields use allowed names, bounded reasons and missing identity fallback', () => {
 const result=parseIdentification({fields:{player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set:'MVP',cardNumber:'87'},reviewFields:[{field:'parallel',reason:'Glare obscures the finish.'},{field:'parallel',reason:'Duplicate'},{field:'user_id',reason:'Injected'}]});
 assert.deepEqual(result.reviewFields,[{field:'parallel',reason:'Glare obscures the finish.'}]);
 const missing=parseIdentification({fields:{player:'Nick Suzuki'}});
 assert(missing.reviewFields.some(row=>row.field==='cardNumber'));
});
