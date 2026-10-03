import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/auth/require-admin-api';
import {createAdminClient} from '@/lib/supabase/admin';
import {parseApifySoldResults} from '@/lib/apify-sold-results';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const ID='apify-suzuki-v1';
const headers={'Cache-Control':'private, no-store'};
async function apify(path:string,body?:unknown) {
 const response=await fetch('https://api.apify.com/v2/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.APIFY_API_TOKEN?.trim()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(response.status===401?'Apify rejected the server token.':`Apify request failed (${response.status}).`);
 return response.json();
}
export async function POST(request:Request) {
 const auth=await requireAdminApi(request);if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 if(!process.env.APIFY_API_TOKEN?.trim())return NextResponse.json({error:'Apify token is not configured.'},{status:503,headers});
 const db=createAdminClient();
 try {
  await apify('users/me');
  const {error}=await db.from('pricing_provider_checks').insert({id:ID});
  if(error){if(error.code==='23505')return NextResponse.json({status:'already-reserved',message:'Use GET to check the existing run. No new charge.'},{headers});throw Error('Could not reserve the diagnostic run.');}
  try {
   const {data:run}=await apify('acts/caffein.dev~ebay-sold-listings/runs?maxItems=10&maxTotalChargeUsd=0.10&timeout=120',{keywords:['2021-22 Upper Deck MVP Nick Suzuki 87'],ebaySite:'ebay.ca',daysToScrape:90,count:10,includeCompletedListings:true,sortOrder:'endedRecently'});
   const {error:saveError}=await db.from('pricing_provider_checks').update({run_id:run.id,state:run.status}).eq('id',ID);
   if(saveError)throw Error('Run started but could not save its reference. Check Apify console; do not start another run.');
   return NextResponse.json({status:run.status,runId:run.id,maxChargeUsd:0.10},{headers});
  }catch(error:any){await db.from('pricing_provider_checks').update({state:'failed',result:{error:error.message||'Diagnostic run failed.'}}).eq('id',ID);throw error;}
 }catch(error:any){return NextResponse.json({error:error.message||'Could not test Apify.'},{status:502,headers});}
}
export async function GET(request:Request) {
 const auth=await requireAdminApi(request);if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 const db=createAdminClient();const {data:check,error}=await db.from('pricing_provider_checks').select('run_id,state,result').eq('id',ID).maybeSingle();
 if(error)return NextResponse.json({error:'Could not load the diagnostic result.'},{status:503,headers});
 if(!check)return NextResponse.json({status:'not-started'},{headers});
 if(check.result)return NextResponse.json({status:check.state,...check.result},{headers});
 if(!check.run_id)return NextResponse.json({status:check.state},{headers});
 try {
  const {data:run}=await apify('actor-runs/'+encodeURIComponent(check.run_id));
  if(run.status!=='SUCCEEDED')return NextResponse.json({status:run.status,usageTotalUsd:run.usageTotalUsd??null},{headers});
  const items=parseApifySoldResults(await apify('datasets/'+encodeURIComponent(run.defaultDatasetId)+'/items?clean=true&limit=10'));
  const result={items,returned:items.length,usablePriceCount:items.filter(item=>item.priceUsable).length,usageTotalUsd:run.usageTotalUsd??null,checkedAt:new Date().toISOString()};
  await db.from('pricing_provider_checks').update({state:'SUCCEEDED',result}).eq('id',ID);
  return NextResponse.json({status:'SUCCEEDED',...result},{headers});
 }catch(error:any){return NextResponse.json({error:error.message||'Could not read the diagnostic result.'},{status:502,headers});}
}
