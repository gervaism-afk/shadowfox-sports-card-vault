import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAdminCardUpdates } from "@/lib/admin-card-validation";
import { cleanupCardImages } from "@/lib/image-cleanup";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  let allowed;
  try {
    allowed = {
      ...validateAdminCardUpdates(await req.json()),
      updated_at: new Date().toISOString(),
    };
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Invalid card details" },
      { status: 400 },
    );
  }
  const supabase = createAdminClient(auth.user.id);

  const { data, error } = await supabase
    .from("cards")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = createAdminClient(auth.user.id);
  const { data, error } = await supabase
    .from("cards")
    .delete()
    .eq("id", id)
    .select("user_id")
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (data)
    await cleanupCardImages(
      supabase,
      data.user_id,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
    ).catch(() => {});
  return NextResponse.json({ success: true });
}
