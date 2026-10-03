import type { CardRecord, Sport } from "./types";
import { normalizeOption } from "./catalog/types";
export type ChecklistEntry = {
  number: string;
  player: string;
  team: string;
  subset?: string;
  parallel?: string;
  rookie?: boolean;
  autograph?: boolean;
  relicPatch?: boolean;
};
export type SetChecklist = {
  id: string;
  title: string;
  sport: Sport;
  year: string;
  brand: string;
  set_name: string;
  subset: string;
  parallel: string;
  entries: ChecklistEntry[];
  source_url?: string | null;
  source_name?: string | null;
  source_checked_at?: string | null;
};
export function numberKey(value: string) {
  const clean = value.trim().replace(/^#\s*/, "").toUpperCase();
  return /^\d+$/.test(clean) ? clean.replace(/^0+(?=\d)/, "") : clean;
}
export function parseChecklist(
  text: string,
  start?: number,
  end?: number,
): ChecklistEntry[] {
  const lines = text.trim() ? text.trim().split(/\r?\n/) : [];
  if (!lines.length) {
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start! < 1 ||
      end! < start! ||
      end! - start! >= 2000
    )
      throw new Error(
        "Use a range of up to 2,000 cards, starting at 1 or higher.",
      );
    return Array.from({ length: end! - start! + 1 }, (_, i) => ({
      number: String(start! + i),
      player: "",
      team: "",
    }));
  }
  if (lines.length > 2000)
    throw new Error("A checklist can contain up to 2,000 cards.");
  const seen = new Set<string>();
  return lines.map((line, i) => {
    const columns = line.split("|").map((v) => v.trim());
    if (columns.length > 3)
      throw new Error(`Line ${i + 1}: use number | player | team.`);
    const [number, player = "", team = ""] = columns;
    if (
      !number ||
      number.length > 40 ||
      player.length > 150 ||
      team.length > 150
    )
      throw new Error(
        `Line ${i + 1}: enter a card number and keep names below 150 characters.`,
      );
    const key = numberKey(number);
    if (!key) throw new Error(`Line ${i + 1}: enter a card number.`);
    if (seen.has(key))
      throw new Error(
        `Card number ${number} appears twice. Track different subsets or parallels in separate checklists.`,
      );
    seen.add(key);
    return { number: number.replace(/^#\s*/, ""), player, team };
  });
}
export function validateChecklist(value: Omit<SetChecklist, "id">) {
  if (value.sport !== "Hockey" && value.sport !== "Baseball")
    throw new Error("Choose a sport.");
  for (const key of [
    "title",
    "year",
    "brand",
    "set_name",
    "subset",
    "parallel",
  ] as const) {
    if (
      typeof value[key] !== "string" ||
      value[key].length > 150 ||
      (["title", "year", "brand", "set_name"].includes(key) &&
        !value[key].trim())
    )
      throw new Error(
        "Enter a title, year, brand and set using at most 150 characters per field.",
      );
  }
  if (!Array.isArray(value.entries) || !value.entries.length)
    throw new Error("Add expected card numbers.");
  const entries = parseChecklist(
    value.entries
      .map((e) => {
        if (
          !e ||
          typeof e.number !== "string" ||
          typeof e.player !== "string" ||
          typeof e.team !== "string" ||
          [e.number, e.player, e.team].some((s) => /[|\r\n]/.test(s))
        )
          throw new Error("Invalid checklist entry.");
        return [e.number, e.player, e.team].join("|");
      })
      .join("\n"),
  );
  const rich = entries.map((entry, i) => {
    const original = value.entries[i];
    const extras: Partial<ChecklistEntry> = {};
    for (const key of ["subset", "parallel"] as const) {
      if (original[key] !== undefined) {
        if (typeof original[key] !== "string" || original[key]!.length > 150)
          throw new Error("Invalid checklist scope.");
        extras[key] = original[key];
      }
    }
    for (const key of ["rookie", "autograph", "relicPatch"] as const) {
      if (original[key] !== undefined) {
        if (typeof original[key] !== "boolean")
          throw new Error("Invalid checklist flag.");
        extras[key] = original[key];
      }
    }
    return { ...entry, ...extras };
  });
  if (value.source_url) {
    const url = new URL(value.source_url);
    if (
      url.protocol !== "https:" ||
      !["upperdeck.com", "baseballcardpedia.com"].includes(url.hostname)
    )
      throw new Error("Invalid checklist source.");
  }
  return { ...value, entries: rich };
}
export function checklistSubset(value: string) {
  const n = normalizeOption(value)
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ");
  return /^(base|base set|regular|standard)$/.test(n)
    ? ""
    : n
        .replace(/^base set /, "")
        .replace(/^ud /, "upper deck ")
        .replace(/^upper deck canvas/, "ud canvas");
}
export function checklistParallel(value: string) {
  const n = normalizeOption(value).replace(/^ud /, "");
  return /^(base|regular|standard|none)$/.test(n) ? "" : n;
}
function sameProduct(card: CardRecord, list: SetChecklist) {
  const brand = (s: string) => normalizeOption(s).replace(/^ud$/, "upper deck");
  const set = (s: string) =>
    normalizeOption(s)
      .replace(/(?: hockey| baseball)$/, "")
      .replace(/^upper deck /, "")
      .replace(/^topps /, "")
      .replace(/series one/, "series 1")
      .replace(/series two/, "series 2");
  const saved = set(card.set),
    expected = set(list.set_name);
  const sameSet =
    saved === expected ||
    (!!list.source_url &&
      list.sport === "Baseball" &&
      expected === "base" &&
      ["topps", "base", "series 1", "series 2"].includes(saved));
  return (
    card.sport === list.sport &&
    normalizeOption(card.year) === normalizeOption(list.year) &&
    brand(card.brand) === brand(list.brand) &&
    sameSet
  );
}
export function matchingChecklistCards(
  cards: CardRecord[],
  list: SetChecklist,
  entry: ChecklistEntry,
) {
  const subset = checklistSubset(entry.subset ?? list.subset),
    parallel = checklistParallel(entry.parallel ?? list.parallel);
  return cards.filter(
    (card) =>
      sameProduct(card, list) &&
      numberKey(card.cardNumber) === numberKey(entry.number) &&
      checklistParallel(card.parallel) === parallel &&
      (checklistSubset(card.subset) === subset ||
        (!!list.source_url && !checklistSubset(card.subset))) &&
      (entry.autograph === undefined || card.autograph === entry.autograph) &&
      (entry.relicPatch === undefined || card.relicPatch === entry.relicPatch),
  );
}
export function completion(cards: CardRecord[], list: SetChecklist) {
  const byNumber = new Map<string, CardRecord[]>();
  for (const card of cards) {
    if (!sameProduct(card, list)) continue;
    const key = numberKey(card.cardNumber);
    byNumber.set(key, [...(byNumber.get(key) || []), card]);
  }
  const rows = list.entries.map((entry) => {
    const records = matchingChecklistCards(
      byNumber.get(numberKey(entry.number)) || [],
      list,
      entry,
    );
    return {
      ...entry,
      quantity: records.reduce((n, c) => n + c.quantity, 0),
      cardIds: records.map((c) => c.id),
    };
  });
  const owned = rows.filter((r) => r.quantity > 0),
    missing = rows.filter((r) => r.quantity === 0),
    duplicates = rows.filter((r) => r.quantity > 1);
  const expected = new Set(list.entries.map((e) => numberKey(e.number)));
  const outside = cards.filter(
    (c) =>
      sameProduct(c, list) &&
      checklistSubset(c.subset) === checklistSubset(list.subset) &&
      checklistParallel(c.parallel) === checklistParallel(list.parallel) &&
      !expected.has(numberKey(c.cardNumber)),
  );
  return {
    rows,
    owned,
    missing,
    duplicates,
    outside,
    total: rows.length,
    percent: rows.length ? Math.round((owned.length / rows.length) * 100) : 0,
    extraCopies: duplicates.reduce((n, r) => n + r.quantity - 1, 0),
  };
}
export function productKey(
  card: Pick<CardRecord, "sport" | "year" | "brand" | "set">,
) {
  return JSON.stringify(
    [card.sport, card.year, card.brand, card.set].map(normalizeOption),
  );
}
