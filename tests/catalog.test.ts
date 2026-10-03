import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseHockeySets,parseBaseballSets,parseNhlPlayers,parseNhlTeams,parseMlbTeams,parseMlbPlayers} from '../lib/catalog/parsers';
import {matchesCatalogYear,normalizeOption,optionValues} from '../lib/catalog/types';
import {filterCards,sortCards} from '../lib/utils';
import {defaultFilters,emptyCard} from '../lib/defaults';
import {cardsCsv,filterDescription} from '../lib/collection-export';
test('Upper Deck parser includes only sourced NHL products, preserves season and rejects unrelated releases',()=>{
 const row={title:{rendered:'2025-2026 Upper Deck Ice Hockey Checklist'},link:'https://upperdeck.com/checklist/ice/',class_list:['checklist-category-hockey','checklist-license-nhl']};
 assert.deepEqual(parseHockeySets([row,{...row,class_list:['checklist-category-entertainment']},{...row,link:'https://evil.test/fake'}]),[{year:'2025-26',brand:'Upper Deck',set:'Ice',url:row.link}]);
 assert.equal(parseHockeySets([{...row,title:{rendered:'2026-27 Tim Horton&#8217;s Checklist'}}])[0].set,'Tim Hortons');
});
test('baseball catalogue uses factual set titles and does not invent manufacturers for unknown products',()=>{
 const sets=parseBaseballSets({query:{allpages:[{title:'2026 Topps Chrome'},{title:'2026 Finest'},{title:'2026 Unknown Local Release'},{title:'Main Page'}]}});
 assert.equal(sets.length,3);assert.ok(sets.some(set=>set.brand==='Topps'&&set.set==='Chrome'&&set.year==='2026'));
 assert.ok(sets.some(set=>set.brand==='Topps'&&set.set==='Finest'));assert.ok(sets.some(set=>set.brand===''&&set.set==='Unknown Local Release'));
});
test('league parsers map public names to teams and ignore malformed data',()=>{
 const nhl={data:[{id:8,fullName:'Montréal Canadiens'},{id:70,fullName:'To be determined'}]};assert.deepEqual(parseNhlTeams(nhl),['Montréal Canadiens']);
 assert.deepEqual(parseNhlPlayers([{name:'Nick Suzuki',teamId:'8'}],nhl),[{name:'Nick Suzuki',team:'Montréal Canadiens'}]);
 const mlb={teams:[{id:141,name:'Toronto Blue Jays'}]};assert.deepEqual(parseMlbTeams(mlb),['Toronto Blue Jays']);
 assert.deepEqual(parseMlbPlayers({people:[{fullName:'Vladimir Guerrero Jr.',currentTeam:{id:141}}]},mlb),[{name:'Vladimir Guerrero Jr.',team:'Toronto Blue Jays'}]);
 assert.deepEqual(parseNhlPlayers({},{}),[]);assert.deepEqual(parseMlbPlayers({},{}),[]);
});
test('combined exact filters distinguish sets, brands, seasons, variations and similar player names',()=>{
 const base={...emptyCard(),player:'Nick Suzuki',brand:'Upper Deck',year:'2021-22',set:'MVP',team:'Montreal Canadiens',parallel:'Silver Script'};
 const cards=[base,{...base,id:crypto.randomUUID(),set:'MVP Hockey'},{...base,id:crypto.randomUUID(),year:'2021'},{...base,id:crypto.randomUUID(),player:'Nick Suzuki Jr.'},{...base,id:crypto.randomUUID(),parallel:'Gold Script'},{...base,id:crypto.randomUUID(),brand:'Upper Deck Authenticated'}];
 const filters={...defaultFilters,player:'Nick Suzuki',brand:'Upper Deck',year:'2021-22',set:'MVP',parallel:'Silver Script',team:'Montréal Canadiens'};
 assert.deepEqual(filterCards(cards,filters),[base]);assert.match(filterDescription(filters),/Set: MVP/);
 assert.equal(normalizeOption(' Montréal  Canadiens '),normalizeOption('Montreal Canadiens'));assert.deepEqual(optionValues(['Topps','topps',' Topps ']),['Topps']);
 assert.equal(sortCards([{...base,year:'2021-22'},{...base,year:'2026-27'}],'yearDesc')[0].year,'2026-27');
});
test('filtered CSV exports exactly the selected records and escapes unsafe spreadsheet cells',()=>{
 const csv=cardsCsv([{...emptyCard(),player:'=formula',notes:'quoted "text"\nnext line',quantity:2}]);
 assert.match(csv,/"'=formula"/);assert.match(csv,/"quoted ""text""\nnext line"/);assert.equal(csv.split('\r\n').length,2);
});

test('calendar hockey years include both overlapping seasons without broadening exact seasons or baseball years',()=>{
 assert.equal(matchesCatalogYear('2025-26','2026','Hockey'),true);
 assert.equal(matchesCatalogYear('2026-27','2026','Hockey'),true);
 assert.equal(matchesCatalogYear('2024-25','2026','Hockey'),false);
 assert.equal(matchesCatalogYear('2025-26','2026-27','Hockey'),false);
 assert.equal(matchesCatalogYear('2025-26','2026','Baseball'),false);
});

test('collection year filters include equivalent season labels and keep other seasons separate', () => {
 const base={...emptyCard(),sport:'Hockey' as const,year:'2021-22'};
 const cards=[base,{...base,year:'2021 - 22'},{...base,year:'2021-2022'},{...base,year:'2021'},{...base,year:'2022-23'}];
 assert.equal(filterCards(cards,{...defaultFilters,year:'2021–22'}).length,3);
});
