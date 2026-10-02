import type { CatalogSet, CatalogPlayer } from './types';
import { optionValues } from './types';
type Obj = Record<string, any>;
function record(value: unknown): Obj { return value&&typeof value==='object'&&!Array.isArray(value)?value as Obj:{}; }
function items(value:unknown): unknown[] { return Array.isArray(value)?value:[]; }
function text(value:unknown):string { return typeof value==='string'?value.trim().slice(0,250):''; }
export function decodeTitle(value:string) {
  return value.replace(/<[^>]*>/g,'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&amp;|&quot;|&apos;|&lt;|&gt;|&nbsp;/g,e=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '}[e]||'')).trim();
}
function sourceUrl(value:unknown,host:string):string { try{const u=new URL(String(value));return u.protocol==='https:'&&u.hostname===host?u.href:'';}catch{return '';} }
export function parseHockeySets(value:unknown):CatalogSet[] {
  const result:CatalogSet[]=[];
  for(const item of items(value)){
    const row=record(item);const classes=items(row.class_list);
    if(!classes.includes('checklist-category-hockey')||!classes.includes('checklist-license-nhl'))continue;
    const title=decodeTitle(text(record(row.title).rendered));const match=/^((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)?\d{2}))?\s+(.+)$/.exec(title);
    if(!match)continue;
    const year=match[2]?`${match[1]}-${match[2].slice(-2)}`:match[1];
    let set=match[3].replace(/\s*Checklist\s*$/i,'').replace(/^(?:Upper Deck|UD)\s+/i,'').replace(/\s+(?:Hockey|NHL)\s*$/i,'').trim();
    if(/^tim horton['’]?s$/i.test(set))set='Tim Hortons';
    const url=sourceUrl(row.link,'upperdeck.com');
    if(set&&url)result.push({year,brand:'Upper Deck',set,url});
  }
  return dedupeSets(result);
}
export function parseBaseballSets(value:unknown):CatalogSet[] {
  const rows=items(record(record(value).query).allpages);const result:CatalogSet[]=[];
  for(const item of rows){
    const title=text(record(item).title);const match=/^((?:18|19|20)\d{2})\s+(.+)$/.exec(title);if(!match)continue;
    const body=match[2];
    // Some set names omit their manufacturer; only infer well-established product families.
    const brandMatch=/\b(Topps|Bowman|Panini|Donruss|Fleer|Upper Deck|Leaf|Score|Pinnacle|Pacific|O-Pee-Chee|Press Pass|Select)\b/i.exec(body);
    const canonical:Record<string,string>={topps:'Topps',bowman:'Bowman',panini:'Panini',donruss:'Donruss',fleer:'Fleer','upper deck':'Upper Deck',leaf:'Leaf',score:'Score',pinnacle:'Pinnacle',pacific:'Pacific','o-pee-chee':'O-Pee-Chee','press pass':'Press Pass',select:'Select'};
    const brand=brandMatch?canonical[brandMatch[1].toLowerCase()]:/^(Finest|Stadium Club|Heritage|Allen & Ginter|Triple Threads|Tribute|Tier One|Museum Collection)\b/.test(body)?'Topps':'';
    const set=brand&&body.toLowerCase().startsWith(brand.toLowerCase()+' ')?body.slice(brand.length+1):body===brand?'Base':body;
    result.push({year:match[1],brand,set,url:`https://baseballcardpedia.com/index.php/${encodeURIComponent(title.replace(/ /g,'_'))}`});
  }
  return dedupeSets(result);
}
export function dedupeSets(rows:CatalogSet[]) { return [...new Map(rows.map(row=>[[row.year,row.brand,row.set].join('|').toLowerCase(),row])).values()].sort((a,b)=>b.year.localeCompare(a.year)||a.brand.localeCompare(b.brand)||a.set.localeCompare(b.set)); }
export function parseNhlTeams(value:unknown) { return optionValues(items(record(value).data).map(row=>text(record(row).fullName)).filter(name=>name&&name!=='To be determined')); }
export function parseMlbTeams(value:unknown) { return optionValues(items(record(value).teams).map(row=>text(record(row).name)).filter(Boolean)); }
export function parseNhlPlayers(value:unknown,teams:unknown):CatalogPlayer[] {
  const map=new Map(items(record(teams).data).map(row=>[String(record(row).id),text(record(row).fullName)]));
  return items(value).map(row=>{const p=record(row);return{name:text(p.name),team:map.get(String(p.teamId))||''};}).filter(p=>p.name);
}
export function parseMlbPlayers(value:unknown,teams:unknown):CatalogPlayer[] {
  const map=new Map(items(record(teams).teams).map(row=>[String(record(row).id),text(record(row).name)]));
  return items(record(value).people).map(row=>{const p=record(row);return{name:text(p.fullName),team:map.get(String(record(p.currentTeam).id))||text(record(p.currentTeam).name)};}).filter(p=>p.name);
}
