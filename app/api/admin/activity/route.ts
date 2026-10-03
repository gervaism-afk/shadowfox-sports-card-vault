import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  const p = new URL(request.url).searchParams,
    page = Number(p.get("page") || 1),
    kind = p.get("kind") || "";
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1000000 ||
    !["", "card", "user", "page"].includes(kind)
  )
    return NextResponse.json(
      { error: "Choose a valid activity filter and page." },
      { status: 400 },
    );
  const size = 25;
  let query = createAdminClient()
    .from("admin_activity")
    .select(
      "id,created_at,actor_id,actor_label,action,subject_type,subject_id,summary,details",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (kind === "card")
    query = query.in("action", ["card.updated", "card.deleted"]);
  else if (kind)
    query = query.eq(
      "action",
      kind === "user" ? "user.role_changed" : "content.updated",
    );
  const { data, count, error } = await query.range(
    (page - 1) * size,
    page * size - 1,
  );
  if (error)
    return NextResponse.json(
      { error: "Could not load admin activity." },
      { status: 500 },
    );
  return NextResponse.json(
    { events: data || [], total: count || 0, page, pageSize: size },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
