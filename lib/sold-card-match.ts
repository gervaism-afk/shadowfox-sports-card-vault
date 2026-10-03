import type {CardRecord} from './types';
import type {SoldListing} from './apify-sold-results';
const normalize=(s:string)=>s.normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\bseries\s*(one|1)\b/g,'series 1').replace(/\bseries\s*(two|2)\b/g,'series 2').replace(/[–—]/g,'-').replace(/[^a-z0-9.-]+/g,' ').trim();
export function soldCardMatch(card:Partial<CardRecord>,item:SoldListing):string|null {
 if(!item.priceUsable||!item.url)return 'Transaction price is hidden or unconfirmed';
 const title=normalize(item.title),words=new Set(title.split(/\s+/));
 if(/\b(lot|bundle|pick|choose|list|complete.*set|factory set|\d+\s*cards?)\b/.test(title))return 'Multiple cards or a pick-list listing';
 if(/\b(damaged|crease|creased|reprint|facsimile|custom|digital|proxy)\b/.test(title))return 'Damaged, replica or non-physical card';
 const required=[card.player,card.year,card.brand,card.set,card.cardNumber];
 if(required.some(v=>!v?.trim()))return 'Complete the card identity first';
 if(!normalize(card.player!).split(' ').every(v=>words.has(v)))return 'Different or missing player';
 const year=normalize(card.year!);if(!title.includes(year)&&!( /^\d{4}-\d{2}$/.test(year)&&title.includes(year.slice(0,4)+'-'+year.slice(0,2)+year.slice(-2))))return 'Different or missing year / season';
 const brand=normalize(card.brand!);if(!title.includes(brand)&&!(brand==='upper deck'&&words.has('ud')))return 'Different or missing brand';
 const set=normalize(card.set!).replace(/ hockey$/,'');if(!set.split(' ').every(v=>words.has(v)))return 'Different or missing set';
 const number=normalize(card.cardNumber!);if(!words.has(number)&&!words.has(number.replace(/^0+/,'')))return 'Different or missing card number';
 const variantTitle=card.team?title.replace(normalize(card.team),''):title;
 const expected=normalize([card.brand,card.set,card.subset,card.parallel].filter(Boolean).join(' '));
 const variants=['ice battles','icebattles','silverscript','goldscript','silver','gold','super script','scripts','script','blue','green','red','black','rainbow','refractor','refractors','prizm','foil','speckle','sparkle','purple','orange','yellow','pink','young guns','canvas','printing plate','numbered','sp','ssp'];
 for(const variant of variants)if(new RegExp('\\b'+variant+'\\b').test(variantTitle)&&!expected.includes(variant))return 'Different parallel or subset';
 for(const v of [card.subset,card.parallel])if(v?.trim()&&!normalize(v).split(' ').every(word=>words.has(word)))return 'Parallel or subset not confirmed';
 const signed=/\b(auto|autograph|autographed|signed|signature)\b/.test(title);
 if(signed!==!!card.autograph)return 'Autograph status differs';
 const relic=/\b(relic|patch|jersey|memorabilia)\b/.test(title);if(relic!==!!card.relicPatch)return 'Relic / patch status differs';
 const graded=/\b(psa|bgs|sgc|cgc|beckett|graded|slab)\b/.test(title);
 if(card.gradingCompany){if(!words.has(normalize(card.gradingCompany))||!card.grade||!words.has(normalize(card.grade)))return 'Grade not confirmed';}
 else if(graded)return 'Graded card differs from your ungraded card';
 if(card.serialNumber)return 'Serial-numbered cards need manual comparison';
 return null;
}
