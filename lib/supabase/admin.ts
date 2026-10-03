import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient(actorId?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    global: { headers: actorId ? { "x-shadowfox-admin": actorId } : {} },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
