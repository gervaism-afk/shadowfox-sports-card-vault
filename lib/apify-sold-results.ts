export type SoldListing = {title:string;url:string;amount:number|null;currency:string;soldAt:string;bestOfferAccepted:boolean;priceUsable:boolean};
export function parseApifySoldResults(input:unknown):SoldListing[] {
 if(!Array.isArray(input))throw Error('Invalid sold-listings response.');
 return input.slice(0,10).filter(row=>row&&typeof row==='object').map((row:any)=>{
  const raw=typeof row.soldPrice==='number'?row.soldPrice:typeof row.soldPrice==='string'&&/^\d+(?:\.\d{1,2})?$/.test(row.soldPrice)?Number(row.soldPrice):NaN;
  const amount=Number.isFinite(raw)&&raw>0?raw:null;
  const currency=typeof row.soldCurrency==='string'?row.soldCurrency.toUpperCase():'';
  const bestOfferAccepted=row.isBestOfferAccepted===true||row.listingType==='best_offer_accepted';
  let url='';try{const u=new URL(row.url);if(u.protocol==='https:'&&/^(www\.)?ebay\.(com|ca|co\.uk|de|fr|it|es|com\.au)$/.test(u.hostname))url=u.href;}catch{}
  const soldAt=typeof row.endedAt==='string'?row.endedAt.slice(0,80):'';
  // Missing classification does not prove the public asking price is the transaction price.
  const classified=row.isBestOfferAccepted===false&&['auction','buy_it_now'].includes(row.listingType);
  return {title:typeof row.title==='string'?row.title.slice(0,500):'',url,amount,currency,soldAt,bestOfferAccepted,priceUsable:!!amount&&['CAD','USD'].includes(currency)&&classified&&!bestOfferAccepted};
 });
}
