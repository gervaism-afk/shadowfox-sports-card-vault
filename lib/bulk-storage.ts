import { supabase } from './supabase';
import { validateBulkChanges, type BulkChanges } from './bulk-edit';
export async function bulkUpdateCards(ids: string[],changes:BulkChanges,binderId?:string):Promise<number> {
 if(!supabase) throw new Error('Sign in to update your collection.');
 if(!ids.length || ids.length>500 || new Set(ids).size!==ids.length) throw new Error('Select between 1 and 500 different cards.');
 const patch=validateBulkChanges(changes);
 if(!Object.keys(patch).length&&!binderId) throw new Error('Choose a field to change or a binder.');
 const {data,error}=await supabase.rpc('bulk_update_cards',{card_ids:ids,changes:patch,target_binder_id:binderId||null});
 if(error) throw new Error(error.message);
 if(typeof data!=='number'||data!==ids.length) throw new Error('Unexpected update result. Refresh your collection before trying again.');
 return data;
}
