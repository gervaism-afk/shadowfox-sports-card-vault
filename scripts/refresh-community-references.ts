import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseTcdbSets, parseTcdbChecklist, tcdbGroups, tcdbProduct } from '../lib/catalog/tcdb-parser';
import { load } from 'cheerio';
const output='data/community-checklists.json';
const existing=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):{checklists:{}};
const current = new Date().getUTCFullYear();
const historical = process.argv.includes('--history');
const years = historical ? Array.from({length:current-2015+1},(_,i)=>2015+i) : [current,current-1,2015+(Math.floor(Date.now()/(7*86400000)) % Math.max(1,current-2016))];
const requestLimit = historical ? 900 : 160;
let requests=0, changed=0;
async function html(url:string){
 if(requests>=requestLimit)throw new Error('Reference refresh reached its request limit.');
 requests++;
 await new Promise(resolve=>setTimeout(resolve,250));
 const raw=execFileSync('curl',['--fail','--silent','--show-error','--max-time','20','--user-agent','ShadowFox-Cards/1.0 (public checklist reference)',url],{maxBuffer:4*1024*1024}).toString();
 return raw;
}
async function refresh(){
for(const yearNumber of [...new Set(years)]) for(const sport of ['Hockey','Baseball']){
 if(requests>=requestLimit)break;
 const year=String(yearNumber);
 try{
  const sets=parseTcdbSets(await html(`https://www.tcdb.com/ViewAll.cfm/sp/${sport}/year/${year}`));
  const selected=sets.filter(row=> /^(Tim Hortons|MVP|O-Pee-Chee|Base|Chrome|Heritage|Bowman|Donruss|Prizm)$/.test(row.set)).slice(0,10);
  for(const product of selected){
   if(requests>=requestLimit)break;
   try{
    const firstHtml=await html(product.url),title=load(firstHtml)('title').text();
    if(!title.endsWith(`${sport} Checklist | Trading Card Database`))throw new Error('Source does not match sport.');
    const verified=tcdbProduct(title.replace(/ (?:Hockey|Baseball) Checklist \| Trading Card Database$/,''));
    if(!verified||verified.year!==product.year||verified.brand!==product.brand||verified.set!==product.set)throw new Error('Product identity mismatch.');
    const sid=product.url.split('/')[5],first=parseTcdbChecklist(firstHtml,sid);
    if(!first.entries.length||first.pages>10)continue;
    const entries=[...first.entries];
    for(let page=2;page<=first.pages;page++){
     const next=parseTcdbChecklist(await html(`${product.url}?PageIndex=${page}`),sid);
     if(!next.entries.length)throw new Error('A numbered checklist page is missing.');
     entries.push(...next.entries);
    }
    if(new Set(entries.map(row=>row.number.toUpperCase())).size!==entries.length)throw new Error('Duplicate card numbers.');
    existing.checklists[product.url]={...verified,sport,url:product.url,source:'Trading Card Database community checklist · saved reference',checkedAt:new Date().toISOString(),groups:tcdbGroups(entries)};
    writeFileSync(output,JSON.stringify(existing));
    changed++;console.log(`${sport} ${product.year} ${product.set}: saved ${entries.length} sourced entries`);
   }catch(error){console.log(`Keeping previous reference for ${product.year} ${product.set}: ${error instanceof Error?error.message:'Source unavailable'}`);}
  }
 }catch(error){console.log(`Keeping saved ${sport} ${year} references: ${error instanceof Error?error.message:'Source unavailable'}`);}
}
writeFileSync(output,JSON.stringify(existing));console.log(`Saved references: ${Object.keys(existing.checklists).length}; updated: ${changed}; bounded requests: ${requests}`);

}
refresh().catch(error=>{ console.error(error.message);process.exitCode=1; });
