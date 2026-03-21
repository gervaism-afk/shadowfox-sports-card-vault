import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const role = searchParams.get('role')?.trim() ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '20'), 100);
  const userId = searchParams.get('userId');
  const includeCards = searchParams.get('includeCards') === 'true';
  const includeStats = searchParams.get('includeStats') === 'true';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createAdminClient();

  if (includeCards && userId) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, sport, player, year, brand, set_name, card_number, team, quantity, estimated_value_cad, notes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cards: data ?? [] });
  }

  let usersQuery = supabase
    .from('profiles')
    .select('id, username, email, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (role) usersQuery = usersQuery.eq('role', role);
  if (search) usersQuery = usersQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`);

  const { data: users, error: usersError, count } = await usersQuery;
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const userIds = (users ?? []).map((u: any) => u.id);
  let aggregatesByUser = new Map();
  if (userIds.length) {
    const { data: cardsAgg, error: cardsAggError } = await supabase
      .from('cards')
      .select('user_id, quantity, estimated_value_cad')
      .in('user_id', userIds);
    if (cardsAggError) return NextResponse.json({ error: cardsAggError.message }, { status: 500 });
    for (const row of cardsAgg ?? []) {
      const prev = aggregatesByUser.get(row.user_id) ?? { card_count: 0, total_estimated_value: 0 };
      prev.card_count += Number(row.quantity || 1);
      prev.total_estimated_value += Number(row.estimated_value_cad || 0) * Number(row.quantity || 1);
      aggregatesByUser.set(row.user_id, prev);
    }
  }

  if (includeStats) {
    const [{ count: totalUsers }, { data: allCards }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('cards').select('quantity, estimated_value_cad')
    ]);
    const totalCards = (allCards ?? []).reduce((sum, row: any) => sum + Number(row.quantity || 1), 0);
    const totalValue = (allCards ?? []).reduce((sum, row: any) => sum + Number(row.estimated_value_cad || 0) * Number(row.quantity || 1), 0);
    return NextResponse.json({
      users: (users ?? []).map((u: any) => ({ ...u, ...(aggregatesByUser.get(u.id) ?? { card_count: 0, total_estimated_value: 0 }) })),
      total: count ?? 0,
      page,
      pageSize,
      stats: { totalUsers: totalUsers ?? 0, totalCards, totalValue },
    });
  }

  return NextResponse.json({
    users: (users ?? []).map((u: any) => ({ ...u, ...(aggregatesByUser.get(u.id) ?? { card_count: 0, total_estimated_value: 0 }) })),
    total: count ?? 0,
    page,
    pageSize,
  });
}
