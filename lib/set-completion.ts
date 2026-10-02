import type { CardRecord, Sport } from "./types";
import { normalizeOption } from "./catalog/types";
export type ChecklistEntry = { number: string; player: string; team: string };
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
  return { ...value, entries };
}
export function completion(cards: CardRecord[], list: SetChecklist) {
  const matches = cards.filter(
    (c) =>
      c.sport === list.sport &&
      (["year", "brand", "subset", "parallel"] as const).every(
        (key) => normalizeOption(c[key]) === normalizeOption(list[key]),
      ) &&
      normalizeOption(c.set) === normalizeOption(list.set_name),
  );
  const quantities = new Map<string, number>();
  for (const card of matches) {
    const key = numberKey(card.cardNumber);
    if (key) quantities.set(key, (quantities.get(key) || 0) + card.quantity);
  }
  const rows = list.entries.map((entry) => ({
    ...entry,
    quantity: quantities.get(numberKey(entry.number)) || 0,
  }));
  const owned = rows.filter((r) => r.quantity > 0),
    missing = rows.filter((r) => r.quantity === 0),
    duplicates = rows.filter((r) => r.quantity > 1);
  const expected = new Set(list.entries.map((e) => numberKey(e.number)));
  const outside = matches.filter((c) => !expected.has(numberKey(c.cardNumber)));
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
