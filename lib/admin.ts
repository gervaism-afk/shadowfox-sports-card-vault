import { supabase } from "@/lib/supabase";

export type AdminDashboard = {
  totalUsers: number;
  totalCards: number;
  totalEstimatedValueCad: number;
  newUsers7d: number;
};

export type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  card_count: number;
  total_estimated_value: number;
};

export async function getMyRole(): Promise<"user" | "admin"> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("profiles").select("role").maybeSingle();
  if (error) throw error;
  return (data?.role === "admin" ? "admin" : "user") as "user" | "admin";
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc("admin_dashboard");
  if (error) throw error;
  const row = (data || {}) as Partial<AdminDashboard>;
  return {
    totalUsers: Number(row.totalUsers || 0),
    totalCards: Number(row.totalCards || 0),
    totalEstimatedValueCad: Number(row.totalEstimatedValueCad || 0),
    newUsers7d: Number(row.newUsers7d || 0),
  };
}

export async function getAdminUsersOverview(): Promise<AdminUserRow[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc("admin_users_overview");
  if (error) throw error;
  return ((data || []) as any[]).map((row) => ({
    id: String(row.id || ""),
    username: String(row.username || ""),
    email: String(row.email || ""),
    role: row.role === "admin" ? "admin" : "user",
    created_at: String(row.created_at || ""),
    card_count: Number(row.card_count || 0),
    total_estimated_value: Number(row.total_estimated_value || 0),
  }));
}
