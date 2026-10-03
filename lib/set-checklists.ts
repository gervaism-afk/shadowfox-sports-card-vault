import { supabase } from "./supabase";
import { fetchAllRows } from "./pagination";
import { validateChecklist, type SetChecklist } from "./set-completion";
async function client() {
  if (!supabase) throw new Error("Please sign in.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) throw new Error("Please sign in again.");
  return { db: supabase, userId: data.session.user.id };
}
export async function loadChecklists() {
  const { db, userId } = await client();
  const rows = await fetchAllRows<SetChecklist>((from, to) =>
    db
      .from("set_checklists")
      .select(
        "id,title,sport,year,brand,set_name,subset,parallel,entries,source_url,source_name,source_checked_at",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("title")
      .order("id")
      .range(from, to),
  );
  return rows.map((row) => ({ ...validateChecklist(row), id: row.id }));
}
export async function saveChecklist(
  input: Omit<SetChecklist, "id">,
  id?: string,
) {
  const value = validateChecklist(input);
  const { db, userId } = await client();
  const query = id
    ? db.from("set_checklists").update(value).eq("id", id).eq("user_id", userId)
    : db.from("set_checklists").insert({ ...value, user_id: userId });
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  return data.id as string;
}
export async function deleteChecklist(id: string) {
  const { db, userId } = await client();
  const { error } = await db
    .from("set_checklists")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
