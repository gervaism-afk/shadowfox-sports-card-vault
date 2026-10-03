import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateBulkChanges,bulkPreview} from '../lib/bulk-edit';
import {emptyCard} from '../lib/defaults';
test('bulk changes allow explicit clears and map only approved identity fields',()=>{
 assert.deepEqual(validateBulkChanges({set:' Series One ',parallel:''}),{set_name:'Series One',parallel:''});
 for(const changes of [{user_id:'x'},{estimatedValueCad:'300'},{quantity:'100'},{player:''},{team:null},{brand:'x'.repeat(251)}]) assert.throws(()=>validateBulkChanges(changes));
 assert.equal(bulkPreview([{...emptyCard(),team:'Canadiens'},{...emptyCard(),team:'Toronto'}],{team:'Canadiens'}),1);
});
