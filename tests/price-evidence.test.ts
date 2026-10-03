import {test} from 'node:test';import assert from 'node:assert/strict';
import {validatePriceEvidence,manualPriceEvidence} from '../lib/price-evidence';
import {collectionBackup,parseCollectionBackup} from '../lib/collection-backup';import {emptyCard} from '../lib/defaults';
const evidence={checkedAt:'2026-10-03T00:00:00Z',method:'reviewed-sales',sourceLabel:'Reviewed 130point results',sourceUrl:'https://130point.com/sales/',estimateCad:35,sales:[{amount:30,currency:'CAD',context:'same card sold'},{amount:40,currency:'CAD',context:'same parallel sold'}]};
test('price evidence retains reviewed sales and source without trusting arbitrary injected fields',()=>{
 const parsed=validatePriceEvidence({...evidence,verified:true},35)!;assert.equal(parsed.sales.length,2);assert.equal('verified' in parsed,false);
 for(const patch of [{sourceUrl:'javascript:alert(1)'},{checkedAt:'bad'},{sales:[]},{estimateCad:40}])assert.throws(()=>validatePriceEvidence({...evidence,...patch},35));
 const manual=manualPriceEvidence(38)!;assert.equal(manual.method,'manual');assert.equal(manual.sales.length,0);assert.equal(manualPriceEvidence(0),null);
 const card={...emptyCard(),player:'Nick Suzuki',estimatedValueCad:35,priceEvidence:parsed};assert.deepEqual(parseCollectionBackup(JSON.stringify(collectionBackup([card]))).entries[0].card.priceEvidence,parsed);
});
