import { supabase } from "./supabase";
import { fetchAllRows } from "./pagination";
import { emptyCard } from "./defaults";
import { identityFields, parseIdentification } from "./ai-identification";
import type { CardRecord } from "./types";
export type Binder = { id: string; name: string };
export type BinderCard = { binder_id: string; card_id: string };
export type WantedCard = { id: string; card: CardRecord };
async function client() {
  if (!supabase) throw new Error("Sign in to organize your collection.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in again.");
  return { db: supabase, userId: data.user.id };
}
export async function loadBinders() {
  const { db, userId } = await client();
  const [binders, memberships] = await Promise.all([
    fetchAllRows<Binder>((from,to) => db.from("binders").select("id,name").eq("user_id",userId).order("name").order("id").range(from,to)),
    fetchAllRows<BinderCard>((from,to) => db.from("binder_cards").select("binder_id,card_id").eq("user_id",userId).order("binder_id").order("card_id").range(from,to)),
  ]);
  return { binders, memberships };
}
export async function saveBinder(name: string, id?: string) {
  const { db, userId } = await client(); const value = name.trim();
  if (!value || value.length>80) throw new Error("Use a binder name of 1–80 characters.");
  const query = id ? db.from("binders").update({ name:value }).eq("id",id).eq("user_id",userId) : db.from("binders").insert({name:value,user_id:userId});
  const { data, error } = await query.select("id,name").single();
  if(error) throw new Error(error.code==="23505" ? "You already have a binder with that name." : error.message);
  return data as Binder;
}
export async function deleteBinder(id:string) {
  const { db,userId }=await client();const {error}=await db.from("binders").delete().eq("id",id).eq("user_id",userId);if(error)throw error;
}
export async function setBinderCard(binderId:string,cardId:string,add:boolean) {
  const {db,userId}=await client();
  const query=add ? db.from("binder_cards").upsert({binder_id:binderId,card_id:cardId,user_id:userId},{onConflict:"binder_id,card_id",ignoreDuplicates:true}) : db.from("binder_cards").delete().eq("binder_id",binderId).eq("card_id",cardId).eq("user_id",userId);
  const {error}=await query;if(error)throw error;
}
function wantData(card:CardRecord) {
  if (!card.player.trim()) throw new Error("Enter the player's name.");
  if (!Number.isInteger(card.quantity)||card.quantity<1||card.quantity>100000) throw new Error("Enter a desired quantity between 1 and 100,000.");
  const fields=parseIdentification({fields:Object.fromEntries(identityFields.map(key=>[key,card[key]]))}).fields;
  return {...fields,quantity:card.quantity,notes:card.notes.slice(0,4000)};
}
export async function loadWants():Promise<WantedCard[]> {
  const {db,userId}=await client();
  const rows=await fetchAllRows<{id:string;card_data:Partial<CardRecord>;created_at:string}>((from,to)=>db.from("want_list").select("id,card_data,created_at").eq("user_id",userId).order("created_at",{ascending:false}).order("id").range(from,to));
  return rows.map(row=>({id:row.id,card:{...emptyCard(),...row.card_data,id:row.id,frontImage:"",backImage:"",estimatedValueCad:0,createdAt:row.created_at,updatedAt:row.created_at}}));
}
export async function saveWant(card:CardRecord,id?:string) {
  const {db,userId}=await client();const card_data=wantData(card);
  const query=id?db.from("want_list").update({card_data}).eq("id",id).eq("user_id",userId):db.from("want_list").insert({user_id:userId,card_data});
  const {data,error}=await query.select("id").single();if(error)throw error;return data.id as string;
}
export async function deleteWant(id:string) {
  const {db,userId}=await client();const {error}=await db.from("want_list").delete().eq("id",id).eq("user_id",userId);if(error)throw error;
}
export async function acquireWant(id:string,existingCardId?:string) {
  const {db}=await client();const {data,error}=await db.rpc("acquire_wanted_card",{want_id:id,existing_card_id:existingCardId||null});if(error)throw error;return data as string;
}
