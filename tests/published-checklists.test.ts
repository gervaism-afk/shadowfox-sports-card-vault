import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseUpperDeckChecklist,
  parseBaseballChecklist,
} from "../lib/catalog/checklist-parser";
import {
  completion,
  validateChecklist,
  type SetChecklist,
} from "../lib/set-completion";
import { emptyCard } from "../lib/defaults";
test("published NHL table provides factual names, scope and complete base including Young Guns without merging parallels", () => {
  const html = `<table class="csv-table"><thead><tr>${["Set Name", "Card", "Description", "Team City", "Team Name", "Rookie", "Auto", "Mem/Tech"].map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${[
    ["Base Set", "1", "Mason McTavish", "Anaheim", "Ducks", "", "", ""],
    [
      "Base Set - Young Guns",
      "201",
      "Artyom Levshunov",
      "Chicago",
      "Blackhawks",
      "Rookie",
      "",
      "",
    ],
    [
      "High Gloss Parallel",
      "1",
      "Mason McTavish",
      "Anaheim",
      "Ducks",
      "",
      "",
      "",
    ],
  ]
    .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  const groups = parseUpperDeckChecklist(html);
  const base = groups.find((g) => g.id === "base-complete")!;
  assert.equal(base.entries.length, 2);
  assert.equal(base.entries[1].subset, "Young Guns");
  assert.equal(base.entries[1].rookie, true);
  assert.equal(base.entries[0].team, "Anaheim Ducks");
  assert.equal(
    groups.find((g) => g.label === "High Gloss Parallel")!.parallel,
    "High Gloss",
  );
  const list: SetChecklist = {
    id: "x",
    title: "Published",
    sport: "Hockey",
    year: "2025-26",
    brand: "Upper Deck",
    set_name: "Series 1",
    subset: "",
    parallel: "",
    entries: base.entries,
    source_url: "https://upperdeck.com/checklist/2025-26-series-1/",
  };
  assert.equal(validateChecklist(list).entries[1].subset, "Young Guns");
  const card = {
    ...emptyCard(),
    year: "2025-26",
    brand: "UD",
    set: "Upper Deck Series One",
    cardNumber: "201",
    player: "Artyom Levshunov",
    quantity: 2,
  };
  const result = completion(
    [card, { ...card, cardNumber: "1", parallel: "High Gloss" }],
    list,
  );
  assert.equal(result.owned.length, 1);
  assert.equal(result.extraCopies, 1);
  assert.equal(result.missing[0].number, "1");
});
test("published MLB base sections include both series and exclude gimmicks, parallels and article text", () => {
  const groups = parseBaseballChecklist(
    '<div class="mw-parser-output"><h2>Base Set</h2><h3>Series One</h3><ul style="list-style-type:none"><li>1 Aaron Judge</li><li>2 Rookie Player RC</li></ul><h3>Series Two</h3><ul style="list-style-type:none"><li>351 Another Player</li></ul><h3>Gimmicks</h3><ul style="list-style-type:none"><li>1 Fake Variation</li></ul><h2>Parallels</h2><ul style="list-style-type:none"><li>1 Another Variation</li></ul></div>',
  );
  const base = groups.find((g) => g.id === "base-complete")!;
  assert.deepEqual(
    base.entries.map((e) => e.number),
    ["1", "2", "351"],
  );
  assert.equal(base.entries[1].player, "Rookie Player");
  assert.ok(!base.entries.some((e) => e.player.includes("Variation")));
  assert.deepEqual(
    parseUpperDeckChecklist("<table><tr><td>Not a checklist</td></tr></table>"),
    [],
  );
});

test('historical MVP script parallels retain parallel identity and separate rookie scopes',()=>{
 const rows=[['Base Set','87','Nick Suzuki'],['Silver Script Parallel','87','Nick Suzuki'],['Super Script Black Parallel - Rookie SP\'s','201','Rookie Player'],['20th Anniversary Super Script Parallel','A1','Nick Suzuki']];
 const html='<table class="csv-table"><thead><tr>'+['Set Name','Card','Description'].map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>`<td>${v}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
 const groups=parseUpperDeckChecklist(html);assert.equal(groups.find(g=>g.label==='Silver Script Parallel')?.parallel,'Silver Script');assert.equal(groups.find(g=>g.label.startsWith('Super Script Black'))?.subset,"Rookie SP's");assert.equal(groups.find(g=>g.label.startsWith('20th Anniversary'))?.parallel,'Super Script');
});
test('baseball inserts, alphabetic autograph numbers and explicit parallel lists stay outside the combined base',()=>{
 const html='<h2>Base Set</h2><ul style="list-style:none"><li>1 Aaron Judge</li></ul><h2>Inserts</h2><h3>Future Stars</h3><ul style="list-style:none"><li>FS-1 Gunnar Henderson</li></ul><h2>Autographs</h2><h3>Rookie Autographs</h3><ul style="list-style:none"><li>RA-AA Andrew Abbott</li></ul><h2>Parallels</h2><h3>Gold Refractor</h3><ul style="list-style:none"><li>1 Aaron Judge</li><li>Gold serial numbered to 50</li></ul>';
 const groups=parseBaseballChecklist(html);assert.equal(groups.find(g=>g.id==='base-complete')?.entries.length,1);assert.equal(groups.find(g=>g.subset==='Future Stars')?.entries[0].number,'FS-1');assert.equal(groups.find(g=>g.subset==='Rookie Autographs')?.entries[0].autograph,true);assert.equal(groups.find(g=>g.parallel==='Gold Refractor')?.entries.length,1);
});
