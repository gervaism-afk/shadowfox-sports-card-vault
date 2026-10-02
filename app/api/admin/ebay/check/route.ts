import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { checkEbayAccess } from '@/lib/ebay-access';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ configured: false, error: 'Save EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in Vercel Production.' }, { status: 503 });
  try {
    return NextResponse.json({ configured: true, ...await checkEbayAccess(clientId, clientSecret) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'The eBay access check did not finish. Try again shortly.' }, { status: 502 }); }
}
