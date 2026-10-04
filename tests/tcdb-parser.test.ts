import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTcdbSets, parseTcdbChecklist, tcdbProduct, tcdbGroups } from '../lib/catalog/tcdb-parser';
import { validateChecklist } from '../lib/set-completion';
test('community index supplies dated manufacturer sets and skips variant links and foreign URLs',()=>{
 const rows=parseTcdbSets(`<a href="/ViewSet.cfm/sid/688992/2026-27-Upper-Deck-Tim-Hortons">2026-27 Upper Deck Tim Hortons</a><a href="/ViewSet.cfm/sid/1/2026-Topps">2026 Topps</a><a href="/ViewSet.cfm/sid/2/2026-Topps-Gold">2026 Topps - Gold</a><a href="https://evil.example/ViewSet.cfm/sid/4/x">2026 Topps Chrome</a>`);
 assert.equal(rows.length,2);assert.equal(rows[0].set,'Tim Hortons');assert.equal(rows[1].set,'Base');assert.equal(rows[0].url,'https://www.tcdb.com/Checklist.cfm/sid/688992/2026-27-Upper-Deck-Tim-Hortons');assert.equal(tcdbProduct('2026-27 Upper Deck Tim Hortons - Above the Ice'),null);
});
test('community checklist keeps numbered players and teams, follows explicit page count and excludes unrelated links',()=>{
 const html=`<table><tr><td><a href="/ViewCard.cfm/sid/7/cid/10/name"><img src="x"></a></td><td><a href="/ViewCard.cfm/sid/7/cid/10/name">14</a></td><td width="45%"><a href="/Person.cfm/pid/1/name">Nick Suzuki</a> RC</td><td><a href="/Team.cfm/tid/1/name">Montreal Canadiens</a></td></tr><tr><td><a href="/ViewCard.cfm/sid/8/cid/11/name">15</a></td><td><a href="/Person.cfm/pid/2/name">Other card</a></td></tr></table><a href="?PageIndex=2">2</a><a href="?PageIndex=3">3</a>`;
 const parsed=parseTcdbChecklist(html,'7');assert.equal(parsed.entries.length,1);assert.equal(parsed.entries[0].player,'Nick Suzuki');assert.equal(parsed.entries[0].team,'Montreal Canadiens');assert.equal(parsed.entries[0].rookie,true);assert.equal(parsed.pages,3);
 const list={title:'Community checklist',sport:'Hockey' as const,year:'2026-27',brand:'Upper Deck',set_name:'Tim Hortons',subset:'',parallel:'',entries:parsed.entries,source_url:'https://www.tcdb.com/Checklist.cfm/sid/7/2026-27-Upper-Deck-Tim-Hortons'};assert.equal(validateChecklist(list).entries.length,1);assert.throws(()=>validateChecklist({...list,source_url:'https://www.tcdb.com/Checklist.cfm/sid/7/x?url=https://evil.example'}));
});

test('duplicate products prefer the publisher and retain a community alternative',async()=>{
 const {dedupeSets}=await import('../lib/catalog/parsers');const community='https://www.tcdb.com/Checklist.cfm/sid/688992/2026-27-Upper-Deck-Tim-Hortons',publisher='https://upperdeck.com/checklist/2026-27-tim-hortons-checklist/';const product={year:'2026-27',brand:'Upper Deck',set:'Tim Hortons'};const rows=dedupeSets([{...product,url:community},{...product,url:publisher}]);assert.equal(rows.length,1);assert.equal(rows[0].url,publisher);assert.deepEqual(rows[0].alternateUrls,[community]);
});

test('source variation suffixes do not become extra base cards, while printed alphanumeric numbers survive',()=>{
 const entry=(number:string)=>({number,player:'Player',team:''});const groups=tcdbGroups(['1','1b','1c','2','BP-1'].map(entry));assert.deepEqual(groups[0].entries.map(e=>e.number),['1','2','BP-1']);
});
test('bundled references are attributed, valid checklists and include full Tim Hortons and Topps base counts',async()=>{
 const {readFile}=await import('node:fs/promises');const saved=JSON.parse(await readFile(new URL('../data/community-checklists.json',import.meta.url),'utf8'));const rows=Object.values(saved.checklists) as any[];assert.ok(rows.length>=18);for(const data of rows){assert.ok(Number.isFinite(Date.parse(data.checkedAt)));assert.ok(data.source.includes('saved reference'));validateChecklist({title:data.set,sport:data.sport,year:data.year,brand:data.brand,set_name:data.set,subset:'',parallel:'',entries:data.groups[0].entries,source_url:data.url});}
 assert.equal(rows.find(d=>d.year==='2026-27'&&d.set==='Tim Hortons').groups[0].entries.length,120);assert.equal(rows.find(d=>d.year==='2026'&&d.brand==='Topps'&&d.set==='Base').groups[0].entries.length,700);
});
