import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAGE_CONTENT_DEFAULTS, type EditablePageKey, validateContent } from "./defaults";

export async function readPageContent(page: EditablePageKey) {
  const defaults = PAGE_CONTENT_DEFAULTS[page];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return defaults;
  const { data, error } = await createAdminClient().from("site_content").select("value").eq("key", page).maybeSingle();
  if (error) throw new Error("Could not load page content");
  return { ...defaults, ...(validateContent(page, data?.value) || {}) };
}
