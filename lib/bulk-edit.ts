import type { CardRecord } from './types';
export const bulkFields = [
 {key:'player',column:'player',label:'Player'},
 {key:'team',column:'team',label:'Team'},
 {key:'year',column:'year',label:'Year / season'},
 {key:'brand',column:'brand',label:'Brand'},
 {key:'set',column:'set_name',label:'Set'},
 {key:'subset',column:'subset',label:'Subset'},
 {key:'parallel',column:'parallel',label:'Parallel'},
 {key:'cardNumber',column:'card_number',label:'Card number'},
] as const;
export type BulkField = typeof bulkFields[number]['key'];
export type BulkChanges = Partial<Record<BulkField,string>>;
export function validateBulkChanges(changes: unknown): Record<string,string> {
 if(!changes || typeof changes!=='object' || Array.isArray(changes)) throw new Error('Invalid bulk changes.');
 const result:Record<string,string>={};
 for(const [key,value] of Object.entries(changes)) {
  const field=bulkFields.find(row=>row.key===key);
  if(!field) throw new Error('Unsupported bulk field.');
  if(typeof value!=='string' || value.length>250) throw new Error('Use text of at most 250 characters.');
  if(key==='player' && !value.trim()) throw new Error('Player name cannot be empty.');
  result[field.column]=value.trim();
 }
 return result;
}
export function bulkPreview(cards: CardRecord[], changes: BulkChanges) {
 validateBulkChanges(changes);
 return cards.filter(card=>Object.entries(changes).some(([key,value])=>card[key as BulkField]!==value?.trim())).length;
}
