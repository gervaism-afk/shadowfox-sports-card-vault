import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllRows } from '@/lib/pagination';

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const role = searchParams.get('role')?.trim() ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '20');
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || (role && !['user', 'admin'].includes(role))) {
    return NextResponse.json({ error: 'Invalid pagination or role' }, { status: 400 });
  }
  const userId = searchParams.get('userId');
  const includeCards = searchParams.get('includeCards') === 'true';
  const includeStats = searchParams.get('includeStats') === 'true';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createAdminClient();

  if (includeCards && userId) {
    try {
      const cards = await fetchAllRows((from, to) => supabase.from('cards')
        .select('id, sport, player, year, brand, set_name, card_number, team, quantity, estimated_value_cad, notes')
        .eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(from, to));
      return NextResponse.json({ cards });
    } catch { return NextResponse.json({ error: 'Could not load cards' }, { status: 500 }); }
  }

  let usersQuery = supabase
    .from('profiles')
    .select('id, username, email, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id')
    .range(from, to);

  if (role) usersQuery = usersQuery.eq('role', role);
  if (search) {
    const pattern = `%${search}%`.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    usersQuery = usersQuery.or(`username.ilike."${pattern}",email.ilike."${pattern}"`);
  }

  const { data: users, error: usersError, count } = await usersQuery;
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const userIds = (users ?? []).map((u: any) => u.id);
  let aggregatesByUser = new Map();
  if (userIds.length) {
    let cardsAgg: any[];
    try {
      cardsAgg = await fetchAllRows((from, to) => supabase.from('cards')
        .select('user_id, quantity, estimated_value_cad').in('user_id', userIds).order('id').range(from, to));
    } catch { return NextResponse.json({ error: 'Could not load collection totals' }, { status: 500 }); }
    for (const row of cardsAgg ?? []) {
      const prev = aggregatesByUser.get(row.user_id) ?? { card_count: 0, total_estimated_value: 0 };
      prev.card_count += Number(row.quantity || 1);
      prev.total_estimated_value += Number(row.estimated_value_cad || 0) * Number(row.quantity || 1);
      aggregatesByUser.set(row.user_id, prev);
    }
  }

  if (includeStats) {
    let totalUsers: number;
    let allCards: any[];
    try {
    const [userCount, cardRows] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      fetchAllRows((from, to) => supabase.from('cards').select('quantity, estimated_value_cad').order('id').range(from, to))
    ]);
    if (userCount.error) throw userCount.error;
    totalUsers = userCount.count || 0;
    allCards = cardRows;
    } catch { return NextResponse.json({ error: 'Could not load portfolio totals' }, { status: 500 }); }
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
