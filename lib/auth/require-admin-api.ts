import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireAdminApi(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, error: 'Missing bearer token' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false as const, status: 503, error: 'Authentication is not configured' };
  }
  const supabase = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Invalid session' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return { ok: false as const, status: 500, error: profileError.message };
  }

  if (profile?.role !== 'admin') {
    return { ok: false as const, status: 403, error: 'Admin access required' };
  }

  return { ok: true as const, user };
}
