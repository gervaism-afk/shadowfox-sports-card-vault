import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getCardCatalog } from '@/lib/catalog/server';
export const maxDuration=30;
export async function GET(request:Request){
  if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
  revalidateTag('card-catalog');
  const [hockey,baseball]=await Promise.all([getCardCatalog('Hockey',''),getCardCatalog('Baseball','')]);
  return NextResponse.json({ok:true,refreshedAt:new Date().toISOString(),hockey:{players:hockey.players.length,sets:hockey.sets.length,sources:hockey.sources},baseball:{players:baseball.players.length,sets:baseball.sets.length,sources:baseball.sources}});
}
