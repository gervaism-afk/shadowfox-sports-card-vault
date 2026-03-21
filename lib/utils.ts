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
      (!filters.brand || card.brand.toLowerCase().includes(filters.brand.toLowerCase())) &&
      (!filters.player || card.player.toLowerCase().includes(filters.player.toLowerCase())) &&
      (!filters.team || card.team.toLowerCase().includes(filters.team.toLowerCase())) &&
      (!filters.year || card.year.includes(filters.year)) &&
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
      case "yearDesc": return Number(b.year || 0) - Number(a.year || 0);
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
