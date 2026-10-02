import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCard } from '../lib/defaults';
import { parseCollectionBackup, reviewRestore, restoreId, collectionBackup, MAX_BACKUP_CARDS } from '../lib/collection-backup';
const card=()=>({...emptyCard(),player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set:'MVP',cardNumber:'87',quantity:2,parallel:'Silver Script',notes:'Saved notes',estimatedValueCad:3.25,createdAt:'2022-01-01T00:00:00.000Z'});
test('portable collection backup preserves metadata and embedded photos without ownership fields',()=>{
 const original={...card(),frontImage:'data:image/png;base64,AAAA'};
 const backup=collectionBackup([original]);
 const parsed=parseCollectionBackup(JSON.stringify(backup));
 assert.equal(parsed.entries[0].card.quantity,2);assert.equal(parsed.entries[0].card.estimatedValueCad,3.25);
 assert.equal(parsed.entries[0].card.frontImage,original.frontImage);assert.equal(parsed.entries[0].card.notes,'Saved notes');
 assert.equal(parsed.entries[0].card.createdAt,original.createdAt);assert.equal(parsed.entries[0].sourceKey,original.id);
 assert.notEqual(parsed.entries[0].card.id,original.id);assert.equal('user_id' in backup.cards[0],false);
 assert.equal(parseCollectionBackup(JSON.stringify(collectionBackup([{...card(),player:''}]))).entries[0].card.player,'');
});
test('legacy JSON strips remote photos and injected owner/role fields',()=>{
 const original={...card(),frontImage:'https://another-account.test/card.jpg',user_id:'foreign-owner',role:'admin'};
 const parsed=parseCollectionBackup(JSON.stringify([original]));
 assert.equal(parsed.legacy,true);assert.equal(parsed.entries[0].omittedPhotos,1);assert.equal(parsed.entries[0].card.frontImage,'');
 assert.equal('user_id' in parsed.entries[0].card,false);assert.equal('role' in parsed.entries[0].card,false);
});
test('malformed files, unsupported versions, invalid card fields and duplicate source IDs fail before restore',()=>{
 for(const text of ['bad','{}',JSON.stringify({format:'shadowfox-collection-backup',version:2,cards:[]})])assert.throws(()=>parseCollectionBackup(text));
 const original=card();
 for(const patch of [{quantity:0},{quantity:1.5},{estimatedValueCad:-1},{estimatedValueCad:'25'},{player:null},{sport:'Other'},{rookie:'false'},{frontImage:'javascript:alert(1)'},{frontImage:'data:image/svg+xml;base64,AAAA'},{notes:12}])assert.throws(()=>parseCollectionBackup(JSON.stringify([{...original,...patch}])),/Card 1:/);
 assert.throws(()=>parseCollectionBackup(JSON.stringify([original,original])),/Card 2:.*more than once/);
 assert.throws(()=>parseCollectionBackup(JSON.stringify(Array(MAX_BACKUP_CARDS+1).fill(original))),/2,000/);
});
test('review skips existing identities and restored IDs while preserving distinct variants and separate source entries',async()=>{
 const original=card(),other={...card(),parallel:'Gold Script'};
 const parsed=parseCollectionBackup(JSON.stringify([original,other]));
 const owned={...original,id:crypto.randomUUID(),quantity:9,notes:'Current notes'};
 const plan=await reviewRestore(parsed.entries,[owned],'owner-a');
 assert.deepEqual(plan.map(p=>p.skip),[true,false]);assert.equal(owned.quantity,9);assert.equal(owned.notes,'Current notes');
 assert.equal((await reviewRestore(parsed.entries,[{...other,id:plan[1].restoreId}],'owner-a'))[1].skip,true);
 const separate=parseCollectionBackup(JSON.stringify([card(),card()]));
 assert.deepEqual((await reviewRestore(separate.entries,[],'owner-a')).map(p=>p.skip),[false,false]);
});
test('restore IDs are stable within an account and different between accounts, including older files without IDs',async()=>{
 assert.equal(await restoreId('owner-a','source'),await restoreId('owner-a','source'));
 assert.notEqual(await restoreId('owner-a','source'),await restoreId('owner-b','source'));
 const {id,...legacy}=card();
 const a=parseCollectionBackup(JSON.stringify([legacy])),b=parseCollectionBackup(JSON.stringify([legacy]));
 assert.equal(a.entries[0].sourceKey,b.entries[0].sourceKey);
});
