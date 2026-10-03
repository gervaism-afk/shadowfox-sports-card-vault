import { supabase } from './supabase';
import { loadBinders, loadWants } from './organize';
import { loadChecklists } from './set-checklists';
import { loadTransactions } from './transactions';
import { identityFields } from './ai-identification';
import { restoreId, type BackupReview } from './collection-backup';
import { duplicateKey } from './matching';
import type { CardRecord } from './types';
import type { BackupSections } from './backup-sections';
export async function loadBackupSections():Promise<BackupSections> {
 const [organization,checklists,wants,transactions]=await Promise.all([loadBinders(),loadChecklists(),loadWants(),loadTransactions()]);
 return {...organization,checklists,wants:wants.map(w=>({id:w.id,card_data:Object.fromEntries([...identityFields,'quantity','notes'].map(k=>[k,w.card[k as keyof CardRecord]]))})),transactions};
}
export async function restoreBackupSections(backup:BackupReview,cards:CardRecord[],ownerId:string,stopped:()=>boolean){
 if(!backup.sections)return 0;if(!supabase)throw Error('Please sign in.');const sections=backup.sections;
 const map=new Map<string,string>();
 for(const entry of backup.entries){const stable=await restoreId(ownerId,entry.sourceKey);const card=cards.find(c=>c.id===entry.sourceKey)||cards.find(c=>c.id===stable)||cards.find(c=>duplicateKey(c)===duplicateKey(entry.card));if(card)map.set(entry.sourceKey,card.id);}
 const existing=await loadBackupSections();let added=0;
 async function insert(table:string,rows:Record<string,unknown>[],conflict='id'){
  for(let i=0;i<rows.length;i+=100){if(stopped())throw Error('Restore stopped. Already saved records are kept; choose restore again to resume.');
   const {data,error}=await supabase!.auth.getSession();if(error||data.session?.user.id!==ownerId)throw Error('Your account changed. Recheck the backup.');
   const result=await supabase!.from(table).upsert(rows.slice(i,i+100).map(r=>({...r,user_id:ownerId})),{onConflict:conflict,ignoreDuplicates:true}).select(conflict);
   if(result.error)throw result.error;added+=result.data?.length||0;
  }
 }
 const binderMap=new Map<string,string>();const newBinders=[];
 for(const b of sections.binders){const saved=existing.binders.find(v=>v.id===b.id||v.name===b.name);const key=saved?.id||await restoreId(ownerId,'binder:'+b.id);binderMap.set(b.id,key);if(!saved)newBinders.push({id:key,name:b.name});}
 await insert('binders',newBinders);
 await insert('binder_cards',sections.memberships.filter(m=>map.has(m.card_id)).map(m=>({binder_id:binderMap.get(m.binder_id),card_id:map.get(m.card_id)})),'binder_id,card_id');
 const checklistRows=[];for(const row of sections.checklists)if(!existing.checklists.some(e=>e.id===row.id))checklistRows.push({...row,id:await restoreId(ownerId,'checklist:'+row.id)});await insert('set_checklists',checklistRows);
 const wants=[];for(const row of sections.wants)if(!existing.wants.some(e=>e.id===row.id))wants.push({...row,id:await restoreId(ownerId,'want:'+row.id)});await insert('want_list',wants);
 const tx=[];for(const row of sections.transactions)if(!existing.transactions.some(e=>e.id===row.id))tx.push({...row,id:await restoreId(ownerId,'transaction:'+row.id),card_id:row.card_id?map.get(row.card_id)||null:null});await insert('card_transactions',tx);
 return added;
}
