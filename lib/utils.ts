import { normalizeOption } from "./catalog/types";
import { CardRecord, Filters, SortKey } from "@/lib/types";

export const totalCards = (cards: CardRecord[]) => cards.reduce((sum, card) => sum + (Number(card.quantity) || 0), 0);
export const totalValue = (cards: CardRecord[]) => cards.reduce((sum, card) => sum + (Number(card.quantity) || 0) * (Number(card.estimatedValueCad) || 0), 0);
export const uniqueCards = (cards: CardRecord[]) => cards.length;
export const recordTotal = (card: CardRecord) => (Number(card.quantity) || 0) * (Number(card.estimatedValueCad) || 0);

function boolPass(filterValue: "" | "yes" | "no", actual: boolean) {
  if (!filterValue) return true;
  return filterValue === "yes" ? actual : !actual;
}
export function filterCards(cards: CardRecord[], filters: Filters) {
  const q = filters.search.trim().toLowerCase();
  return cards.filter((card) => {
    const haystack = [card.player, card.year, card.brand, card.set, card.subset, card.cardNumber, card.team, card.parallel, card.serialNumber, card.notes].join(" ").toLowerCase();
    return (
      (!q || haystack.includes(q)) &&
      (!filters.sport || card.sport === filters.sport) &&
      (!filters.brand || normalizeOption(card.brand) === normalizeOption(filters.brand)) &&
      (!filters.player || normalizeOption(card.player) === normalizeOption(filters.player)) &&
      (!filters.team || normalizeOption(card.team) === normalizeOption(filters.team)) &&
      (!filters.year || normalizeOption(card.year) === normalizeOption(filters.year)) &&
      (!filters.set || normalizeOption(card.set) === normalizeOption(filters.set)) &&
      (!filters.subset || normalizeOption(card.subset) === normalizeOption(filters.subset)) &&
      (!filters.parallel || normalizeOption(card.parallel) === normalizeOption(filters.parallel)) &&
      boolPass(filters.rookie, card.rookie) &&
      boolPass(filters.autograph, card.autograph) &&
      boolPass(filters.relicPatch, card.relicPatch) &&
      boolPass(filters.graded, !!card.gradingCompany)
    );
  });
}
export function sortCards(cards: CardRecord[], sortKey: SortKey) {
  const next = [...cards];
  next.sort((a, b) => {
    switch (sortKey) {
      case "oldest": return a.createdAt.localeCompare(b.createdAt);
      case "playerAsc": return a.player.localeCompare(b.player);
      case "yearDesc": return b.year.localeCompare(a.year,"en",{numeric:true});
      case "valueDesc": return recordTotal(b) - recordTotal(a);
      default: return b.createdAt.localeCompare(a.createdAt);
    }
  });
  return next;
}
export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
