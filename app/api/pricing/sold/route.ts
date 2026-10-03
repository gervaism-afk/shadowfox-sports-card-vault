import {NextResponse} from 'next/server';import {createHash} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';import {parseApifySoldResults} from '@/lib/apify-sold-results';import {soldCardMatch} from '@/lib/sold-card-match';import {estimateConfirmedSales,parseUsdCadRate} from '@/lib/pricing';import type {CardRecord} from '@/lib/types';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const headers={'Cache-Control':'private, no-store'};
async function apify(path:string,body?:unknown){const r=await fetch('https://api.apify.com/v2/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.APIFY_API_TOKEN?.trim()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Sold-price provider is unavailable.');return r.json();}
export async function GET(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)return NextResponse.json({error:'Sign in to view sold prices.'},{status:401,headers});
 const db=createAdminClient();const {data:auth,error:authError}=await db.auth.getUser(token);if(authError||!auth.user)return NextResponse.json({error:'Please sign in again.'},{status:401,headers});
 const id=new URL(request.url).searchParams.get('cardId');if(!id||! /^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'Invalid card.'},{status:400,headers});
 const {data:row,error}=await db.from('cards').select('*').eq('id',id).eq('user_id',auth.user.id).maybeSingle();if(error||!row)return NextResponse.json({error:'Card unavailable.'},{status:404,headers});
 if(!process.env.APIFY_API_TOKEN)return NextResponse.json({status:'unavailable',message:'Automatic sold prices are not configured.'},{headers});
 const card={sport:row.sport,team:row.team,player:row.player,year:row.year,brand:row.brand,set:row.set_name,subset:row.subset,parallel:row.parallel,cardNumber:row.card_number,gradingCompany:row.grading_company,grade:row.grade,autograph:row.autograph,relicPatch:row.relic_patch,serialNumber:row.serial_number} as CardRecord;
 if([card.player,card.year,card.brand,card.set,card.cardNumber].some(v=>!v?.trim()))return NextResponse.json({status:'incomplete',message:'Add player, year, brand, set and card number to look up sold prices.'},{headers});
 const key=createHash('sha256').update(JSON.stringify(card)).digest('hex');
 const {data:reservation,error:reserveError}=await db.rpc('reserve_sold_price_lookup',{cache_key:key});if(reserveError)return NextResponse.json({status:'unavailable',message:'Sold-price lookup is temporarily unavailable.'},{headers});
 let {data:cache}=await db.from('sold_price_cache').select('*').eq('query_key',key).maybeSingle();
 if(reservation==='budget')return NextResponse.json({status:'budget',message:'The monthly automatic lookup allowance is used. Free manual sold-price review is still available.',...(cache?.result?{previous:cache.result}:{})},{headers});
 if(reservation==='failed')return NextResponse.json({status:'unavailable',message:'The last lookup was unavailable. It will retry after six hours.'},{headers});
 try {
  if(reservation==='start'){
   const query=[card.year,card.brand,card.set,card.player,card.cardNumber,card.subset,card.parallel,card.gradingCompany,card.grade].filter(Boolean).join(' ');
   const {data:run}=await apify('acts/caffein.dev~ebay-sold-listings/runs?maxItems=10&maxTotalChargeUsd=0.08&timeout=120',{keywords:[query],ebaySite:'ebay.ca',count:10,daysToScrape:90,includeCompletedListings:true,sortOrder:'endedRecently'});
   const {error:saveError}=await db.from('sold_price_cache').update({run_id:run.id,state:run.status}).eq('query_key',key);if(saveError)throw Error('Could not retain the lookup reference.');
   return NextResponse.json({status:'pending'},{headers});
  }
  if(cache?.result&&reservation==='cached')return NextResponse.json({status:'complete',...cache.result},{headers});
  if(!cache?.run_id)return NextResponse.json({status:'pending'},{headers});
  const {data:run}=await apify('actor-runs/'+encodeURIComponent(cache.run_id));
  if(['READY','RUNNING'].includes(run.status))return NextResponse.json({status:'pending'},{headers});
  if(run.status!=='SUCCEEDED')throw Error('The sold-price provider could not complete this lookup.');
  const items=parseApifySoldResults(await apify('datasets/'+encodeURIComponent(run.defaultDatasetId)+'/items?clean=true&limit=10')).map(item=>({...item,excludedReason:soldCardMatch(card,item)}));
  const matched=items.filter(item=>!item.excludedReason);let fx:{rate:number;date:string}|null=null;let estimate=null;
  if(matched.some(item=>item.currency==='USD')){try{const r=await fetch('https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=10',{signal:AbortSignal.timeout(10000)});if(r.ok)fx=parseUsdCadRate(await r.json());}catch{}}
  if(matched.length&&(!matched.some(item=>item.currency==='USD')||fx))estimate=estimateConfirmedSales(matched.map((item,index)=>({id:String(index),amount:item.amount!,currency:item.currency as 'CAD'|'USD',context:item.title})),fx?.rate);
  const result={items,matchedCount:matched.length,estimateCad:estimate?.estimateCad??null,fx,checkedAt:new Date().toISOString(),message:matched.length&&matched.some(item=>item.currency==='USD')&&!fx?'Matching sales found; USD-to-CAD conversion is unavailable. Prices are shown in their original currency.':matched.length?'Prices exclude shipping. Match and condition still need your review.':'No confidently matching sales found. Similar variants and pick-list listings are excluded.'};
  await db.from('sold_price_cache').update({state:'SUCCEEDED',result,updated_at:new Date().toISOString()}).eq('query_key',key);
  return NextResponse.json({status:'complete',...result},{headers});
 }catch{await db.from('sold_price_cache').update({state:'failed',updated_at:new Date().toISOString()}).eq('query_key',key);return NextResponse.json({status:'unavailable',message:'Sold-price lookup could not complete. Manual review remains available.'},{headers});}
}
