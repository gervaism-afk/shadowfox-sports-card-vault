import { supabase } from "./supabase";
export async function adminRequest(url: string, options: RequestInit = {}) {
  if (!supabase) throw new Error("Please sign in.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(url, { ...options, headers, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "The admin request failed.");
  return body;
}
