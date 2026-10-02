import { NextResponse } from 'next/server';
import { parseUsdCadRate } from '@/lib/pricing';
export async function GET() {
  try {
    const response = await fetch('https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1', { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error();
    return NextResponse.json({ ...parseUsdCadRate(await response.json()), source: 'Bank of Canada', sourceUrl: 'https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/' }, { headers: { 'Cache-Control': 'public, max-age=900' } });
  } catch { return NextResponse.json({ error: 'Could not get a recent USD to CAD rate. Try again, or enter confirmed prices in CAD below.' }, { status: 503 }); }
}
