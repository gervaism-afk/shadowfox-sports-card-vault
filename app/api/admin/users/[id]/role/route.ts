import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await req.json();
  const role = body?.role;

  if (!['user', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select('id, role')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
