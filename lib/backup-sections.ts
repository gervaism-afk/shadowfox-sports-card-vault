import { identityFields, parseIdentification } from './ai-identification';
import { validateChecklist, type SetChecklist } from './set-completion';
import type { Transaction } from './transaction-math';
export type BackupSections = {
 binders: {id:string;name:string}[];
 memberships: {binder_id:string;card_id:string}[];
 checklists: SetChecklist[];
 wants: {id:string;card_data:Record<string,unknown>}[];
 transactions: Transaction[];
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(v:unknown):string {if(typeof v!=='string'||!uuid.test(v))throw Error('Invalid record reference in backup.');return v.toLowerCase();}
function str(v:unknown,max:number,required=false):string {if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error('Invalid text in backup records.');return v;}
function integer(v:unknown,max:number,min=0):number {if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)throw Error('Invalid quantity or amount in backup records.');return v;}
export function parseBackupSections(value:unknown):BackupSections {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Missing collection records in complete backup.');
 const input=value as Record<string,unknown>;
 function rows(name:string,max=2000):Record<string,unknown>[] {const r=input[name];if(!Array.isArray(r)||r.length>max||r.some(v=>!v||typeof v!=='object'||Array.isArray(v)))throw Error(`Invalid ${name} in backup.`);return r;}
 function unique<T extends {id:string}>(r:T[]){if(new Set(r.map(v=>v.id)).size!==r.length)throw Error('Duplicate record IDs in backup.');return r;}
 const binders=unique(rows('binders').map(r=>({id:id(r.id),name:str(r.name,80,true)})));
 if(new Set(binders.map(b=>b.name)).size!==binders.length)throw Error('Duplicate binder names in backup.');
 const memberships=rows('memberships',20000).map(r=>({binder_id:id(r.binder_id),card_id:id(r.card_id)}));
 if(memberships.some(m=>!binders.some(b=>b.id===m.binder_id)))throw Error('A membership refers to a missing binder.');
 const checklists=unique(rows('checklists').map(r=>{const key=id(r.id);return {...validateChecklist(r as unknown as SetChecklist),id:key};})).map(({id,title,sport,year,brand,set_name,subset,parallel,entries,source_url,source_name,source_checked_at})=>({id,title,sport,year,brand,set_name,subset,parallel,entries,source_url,source_name,source_checked_at}));
 const wants=unique(rows('wants').map(r=>{
  if(!r.card_data||typeof r.card_data!=='object'||Array.isArray(r.card_data))throw Error('Invalid wanted card.');const d=r.card_data as Record<string,unknown>;
  const fields=parseIdentification({fields:Object.fromEntries(identityFields.filter(k=>d[k]!==undefined).map(k=>[k,d[k]]))}).fields;
  str(fields.player,250,true);if(!fields.sport)throw Error('Wanted card needs a sport.');
  return {id:id(r.id),card_data:{...fields,quantity:integer(d.quantity,100000,1),notes:str(d.notes??'',4000)}};
 }));
 const transactions=unique(rows('transactions',10000).map(r=>{
  if(r.kind!=='purchase'&&r.kind!=='sale')throw Error('Invalid transaction type.');const date=str(r.occurred_on,10,true);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid transaction date.');
  const cost=r.cost_cents==null?null:integer(r.cost_cents,100000000);if(r.kind==='purchase'&&cost!==null)throw Error('Invalid purchase cost.');
  return {id:id(r.id),card_id:r.card_id==null?null:id(r.card_id),card_label:str(r.card_label,1000,true),kind:r.kind,occurred_on:date,quantity:integer(r.quantity,100000,1),amount_cents:integer(r.amount_cents,100000000),fees_cents:integer(r.fees_cents,100000000),cost_cents:cost,notes:str(r.notes??'',4000)} as Transaction;
 }));
 return {binders,memberships,checklists,wants,transactions};
}
