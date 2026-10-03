import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completion,
  parseChecklist,
  validateChecklist,
  type SetChecklist,
} from "../lib/set-completion";
import { emptyCard } from "../lib/defaults";
const list: SetChecklist = {
  id: "test",
  title: "Series 1 base",
  sport: "Hockey",
  year: "2025-26",
  brand: "Upper Deck",
  set_name: "Series 1",
  subset: "",
  parallel: "",
  entries: parseChecklist("", 1, 3),
};
test("completion counts unique owned numbers, sums duplicate quantity and keeps seasons, subsets and parallels separate", () => {
  const base = {
    ...emptyCard(),
    sport: "Hockey" as const,
    year: "2025-26",
    brand: "Upper Deck",
    set: "Series 1",
    cardNumber: "01",
    quantity: 2,
  };
  const r = completion(
    [
      base,
      { ...base, id: "2", cardNumber: "#1", quantity: 1 },
      { ...base, cardNumber: "2", quantity: 1 },
      { ...base, cardNumber: "3", parallel: "High Gloss" },
      { ...base, cardNumber: "3", subset: "Young Guns" },
      { ...base, cardNumber: "3", year: "2026-27" },
      { ...base, cardNumber: "99" },
      { ...base, cardNumber: "" },
    ],
    list,
  );
  assert.equal(r.percent, 67);
  assert.equal(r.owned.length, 2);
  assert.equal(r.missing[0].number, "3");
  assert.equal(r.duplicates.length, 1);
  assert.equal(r.extraCopies, 2);
  assert.equal(r.outside.length, 2);
});
test("checklists accept gaps, prefix numbers and optional names, reject duplicate normalized numbers and oversized ranges", () => {
  assert.deepEqual(parseChecklist("YG-1 | Nick Suzuki | Canadiens\nYG-3"), [
    { number: "YG-1", player: "Nick Suzuki", team: "Canadiens" },
    { number: "YG-3", player: "", team: "" },
  ]);
  assert.throws(() => parseChecklist("1\n01"), /twice/);
  assert.throws(() => parseChecklist("#"), /card number/);
  assert.throws(() => parseChecklist("", 1e20, 1e20), /range/);
  assert.throws(() => parseChecklist("", 1, 2001), /2,000/);
  assert.throws(() => parseChecklist("", 10, 2), /range/);
  assert.throws(() => parseChecklist("1 | A | B | C"), /Line 1/);
  assert.equal(completion([], list).percent, 0);
  assert.throws(() => validateChecklist({ ...list, year: "" }), /Enter/);
});

test("season formatting matches owned cards without treating a calendar year or another season as the same release", () => {
  const base = { ...emptyCard(), sport: "Hockey" as const, brand: "Upper Deck", set: "Series 1", cardNumber: "1" };
  for (const year of ["2025 - 26", "2025–26", "2025-2026"]) {
    assert.equal(completion([{ ...base, year }], list).owned.length, 1);
  }
  for (const year of ["2025", "2026", "2024-25", "2025-2027"]) {
    assert.equal(completion([{ ...base, year }], list).owned.length, 0);
  }
});
