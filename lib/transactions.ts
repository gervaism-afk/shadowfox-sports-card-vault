import { supabase } from "./supabase";
import { fetchAllRows } from "./pagination";
import type { Transaction } from "./transaction-math";
async function client() {
  if (!supabase) throw new Error("Sign in to manage transactions.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in again.");
  return { db: supabase, userId: data.user.id };
}
export async function loadTransactions(): Promise<Transaction[]> {
  const { db, userId } = await client();
  return fetchAllRows<Transaction>((from,to) => db.from("card_transactions").select("id,card_id,card_label,kind,occurred_on,quantity,amount_cents,fees_cents,cost_cents,notes").eq("user_id",userId).order("occurred_on",{ascending:false}).order("id").range(from,to));
}
export async function saveTransaction(row: Omit<Transaction,"id">, id?: string) {
  const { db, userId } = await client();
  if (!row.card_label.trim() || row.card_label.length > 1000) throw new Error("Enter a card description of up to 1,000 characters.");
  if (!Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 100000) throw new Error("Enter a quantity between 1 and 100,000.");
  for (const value of [row.amount_cents,row.fees_cents,row.cost_cents]) if (value !== null && (!Number.isInteger(value) || value < 0 || value > 100000000)) throw new Error("Enter a valid CAD amount.");
  const payload = { ...row, card_label: row.card_label.trim(), cost_cents: row.kind === "sale" ? row.cost_cents : null };
  const query = id ? db.from("card_transactions").update(payload).eq("id",id).eq("user_id",userId) : db.from("card_transactions").insert({ ...payload,user_id:userId });
  const { error } = await query.select("id").single(); if (error) throw error;
}
export async function deleteTransaction(id: string) {
  const {db,userId} = await client();
  const {error} = await db.from("card_transactions").delete().eq("id",id).eq("user_id",userId); if(error) throw error;
}
