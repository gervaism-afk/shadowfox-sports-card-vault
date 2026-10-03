import type { PastedSaleAmount } from './pricing';
export type PriceEvidence={checkedAt:string;method:'reviewed-sales'|'manual';sourceLabel:string;sourceUrl:string;estimateCad:number;sales:Pick<PastedSaleAmount,'amount'|'currency'|'context'>[];fxRate?:number;fxDate?:string};
export function validatePriceEvidence(value:unknown,estimate?:number):PriceEvidence|null {
 if(value==null)return null;if(typeof value!=='object'||Array.isArray(value))throw Error('Invalid price evidence.');const v=value as Record<string,unknown>;
 if(typeof v.checkedAt!=='string'||v.checkedAt.length>40||!Number.isFinite(Date.parse(v.checkedAt))||!['reviewed-sales','manual'].includes(String(v.method)))throw Error('Invalid price review date or method.');
 if(typeof v.sourceLabel!=='string'||v.sourceLabel.length>150||typeof v.sourceUrl!=='string'||v.sourceUrl.length>1000)throw Error('Invalid price source.');
 if(v.sourceUrl){const url=new URL(v.sourceUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS source link.');}
 if(typeof v.estimateCad!=='number'||!Number.isFinite(v.estimateCad)||v.estimateCad<0||(estimate!==undefined&&v.estimateCad!==estimate))throw Error('The supporting estimate does not match this card value.');
 if(!Array.isArray(v.sales)||v.sales.length>100)throw Error('Use up to 100 supporting sales.');
 const sales=v.sales.map(row=>{if(!row||typeof row!=='object'||typeof row.amount!=='number'||!Number.isFinite(row.amount)||row.amount<=0||row.amount>1e9||!['CAD','USD'].includes(row.currency)||typeof row.context!=='string'||row.context.length>350)throw Error('Invalid supporting sale.');return {amount:row.amount,currency:row.currency as 'CAD'|'USD',context:row.context};});
 if(v.method==='reviewed-sales'&&!sales.length)throw Error('Reviewed-sale estimates need supporting sales.');
 if(v.fxRate!==undefined&&(typeof v.fxRate!=='number'||!Number.isFinite(v.fxRate)||v.fxRate<=0||v.fxRate>10))throw Error('Invalid exchange rate.');
 if(v.fxDate!==undefined&&(typeof v.fxDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.fxDate)))throw Error('Invalid exchange rate date.');
 return {checkedAt:new Date(v.checkedAt).toISOString(),method:v.method as PriceEvidence['method'],sourceLabel:v.sourceLabel,sourceUrl:v.sourceUrl,estimateCad:v.estimateCad,sales,...(v.fxRate!==undefined?{fxRate:v.fxRate as number}:{}),...(v.fxDate!==undefined?{fxDate:v.fxDate as string}:{})};
}
export function manualPriceEvidence(estimateCad:number):PriceEvidence|null {
 return estimateCad>0?{checkedAt:new Date().toISOString(),method:'manual',sourceLabel:'Manual estimate',sourceUrl:'',estimateCad,sales:[]}:null;
}
