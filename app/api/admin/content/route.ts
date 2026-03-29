
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page } = await params;
  const defaults = (PAGE_CONTENT_DEFAULTS as Record<string, any>)[page];
  if (!defaults) return NextResponse.json({ error: "Unknown page" }, { status: 404 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", page)
    .maybeSingle();

  return NextResponse.json({ content: { ...defaults, ...(data?.value || {}) } });
}
