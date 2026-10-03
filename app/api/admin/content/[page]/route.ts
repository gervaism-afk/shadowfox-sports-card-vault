import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEditablePage, validateContent } from "@/lib/content/defaults";
import { readPageContent } from "@/lib/content/server";

export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  props: { params: Promise<{ page: string }> },
) {
  const params = await props.params;
  const auth = await requireAdminApi(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isEditablePage(params.page))
    return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  try {
    return NextResponse.json({ content: await readPageContent(params.page) });
  } catch {
    return NextResponse.json(
      { error: "Could not load page content" },
      { status: 500 },
    );
  }
}
export async function PATCH(
  req: Request,
  props: { params: Promise<{ page: string }> },
) {
  const params = await props.params;
  const auth = await requireAdminApi(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isEditablePage(params.page))
    return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const content = validateContent(params.page, body?.content);
  if (!content)
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  const { error } = await createAdminClient(auth.user.id)
    .from("site_content")
    .upsert({
      key: params.page,
      value: content,
      updated_at: new Date().toISOString(),
    });
  if (error)
    return NextResponse.json(
      { error: "Could not save page content" },
      { status: 500 },
    );
  return NextResponse.json({ success: true });
}
