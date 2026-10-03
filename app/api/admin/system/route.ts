import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  const db = createAdminClient();
  const tables = [
    ["profiles", "Users"],
    ["cards", "Card entries"],
    ["binders", "Binders"],
    ["want_list", "Wanted cards"],
    ["set_checklists", "Saved checklists"],
    ["card_transactions", "Purchase & sale records"],
    ["card_image_cleanup", "Pending photo cleanup"],
  ];
  const counts = await Promise.all(
    tables.map(async ([table, label]) => {
      const { count, error } = await db
        .from(table)
        .select("id", { count: "exact", head: true });
      return { label, count: error ? null : count, ok: !error };
    }),
  );
  const { data: buckets, error } = await db.storage.listBuckets();
  const storage = buckets?.find((b) => b.name === "card-images");
  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      counts,
      storage: { ok: !error && !!storage, public: storage?.public ?? false },
      services: [
        {
          name: "AI card identification",
          configured: !!(
            process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
          ),
          detail: process.env.OPENROUTER_API_KEY
            ? "OpenRouter"
            : process.env.OPENAI_API_KEY
              ? "OpenAI"
              : "No AI key configured",
        },
        {
          name: "Browser OCR fallback",
          configured: true,
          detail: "Local text recognition",
        },
        {
          name: "eBay API credentials",
          configured: !!(
            process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET
          ),
          detail: "Credential configuration only; sold-data access is separate",
        },
        {
          name: "Scheduled catalogue refresh",
          configured: !!process.env.CRON_SECRET,
          detail: "Daily at 07:00 UTC",
        },
      ],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
