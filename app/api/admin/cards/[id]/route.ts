import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const updates = await req.json();
  const supabase = createAdminClient();

  const allowed = {
    player: updates.player,
    year: updates.year,
    brand: updates.brand,
    set_name: updates.set_name,
    card_number: updates.card_number,
    team: updates.team,
    quantity: updates.quantity,
    estimated_value_cad: updates.estimated_value_cad,
    notes: updates.notes,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('cards').update(allowed).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
