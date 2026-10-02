import type { Sport } from '../types';
export type CatalogSet = { year: string; brand: string; set: string; url: string };
export type CatalogPlayer = { name: string; team: string };
export type CatalogSource = { name: string; url: string; checkedAt: string; status: 'live'|'saved'; note?: string };
export type CardCatalog = { sport: Sport; teams: string[]; players: CatalogPlayer[]; sets: CatalogSet[]; sources: CatalogSource[] };
export const normalizeOption = (value: string) => value.trim().normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[’‘]/g,"'").replace(/[–—]/g,'-').replace(/\s+/g,' ');
export function optionValues(values: string[]) {
  const unique=new Map<string,string>();
  for(const value of values)if(value.trim()&&!unique.has(normalizeOption(value)))unique.set(normalizeOption(value),value.trim());
  return [...unique.values()].sort((a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'}));
}

// A calendar year can refer to either season spanning it. A full season stays exact.
export function matchesCatalogYear(listed:string,selected:string,sport:Sport){
 const actual=normalizeOption(listed),wanted=normalizeOption(selected);
 if(!wanted)return true;
 if(actual===wanted)return true;
 if(sport!=='Hockey'||!/^\d{4}$/.test(wanted))return false;
 const season=/^(\d{4})-(\d{2})$/.exec(actual);
 return !!season&&(season[1]===wanted||(Number(season[1])+1===Number(wanted)&&season[2]===wanted.slice(-2)));
}
