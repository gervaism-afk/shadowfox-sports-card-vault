import type { Sport } from '../types';
import { normalizeOption } from './types';
// Vocabulary suggestions, not a release checklist. Availability varies by year and card.
export function commonVariants(sport:Sport,brand:string,set:string){
 const b=normalizeOption(brand),s=normalizeOption(set);
 if(sport==='Hockey'&&b==='upper deck'&&/^series [12]$/.test(s))return {subset:['Base','Young Guns','UD Canvas','UD Canvas Young Guns','Dazzlers'],parallel:['Clear Cut','Deluxe','Exclusives','High Gloss','Outburst','Outburst Red','Outburst Gold']};
 if(sport==='Hockey'&&b==='upper deck'&&s==='mvp')return {subset:['Base','Rookies'],parallel:['Silver Script','Super Script','Gold Script']};
 if(sport==='Baseball'&&(b==='topps'||b==='bowman'))return {subset:['Base','Rookies','Autographs'],parallel:s.includes('chrome')?['Refractor','Prism Refractor','X-Fractor','Purple Refractor','Blue Refractor','Green Refractor','Gold Refractor','Orange Refractor','Red Refractor','SuperFractor']:['Gold','Rainbow Foil','Gold Foil','Black','Platinum','Printing Plate']};
 return {subset:['Base','Rookies','Autographs','Memorabilia'],parallel:['Silver','Gold','Red','Blue','Green','Black','Printing Plate']};
}
