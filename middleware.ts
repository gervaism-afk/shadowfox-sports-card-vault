import { CardRecord } from "@/lib/types";

export function duplicateKey(card: CardRecord) {
  return [
    card.sport,
    card.player.trim().toLowerCase(),
    card.year.trim(),
    card.brand.trim().toLowerCase(),
    card.set.trim().toLowerCase(),
    card.subset.trim().toLowerCase(),
    card.cardNumber.trim().toLowerCase(),
    card.parallel.trim().toLowerCase(),
    card.serialNumber.trim().toLowerCase(),
    card.gradingCompany.trim().toLowerCase(),
    card.grade.trim().toLowerCase(),
  ].join("|");
}

export function ebayQuery(card: Partial<CardRecord>) {
  return [
    card.year || "",
    card.player || "",
    card.brand || "",
    card.set || "",
    card.subset || "",
    card.cardNumber ? `#${card.cardNumber}` : "",
    card.parallel || "",
    card.rookie ? "rookie" : "",
    card.autograph ? "auto" : "",
    card.relicPatch ? "patch" : "",
  ].filter(Boolean).join(" ").trim();
}

export const ebayActiveUrl = (card: Partial<CardRecord>) => `https://www.ebay.ca/sch/i.html?_nkw=${encodeURIComponent(ebayQuery(card))}`;
export const ebaySoldUrl = (card: Partial<CardRecord>) => `https://www.ebay.ca/sch/i.html?_nkw=${encodeURIComponent(ebayQuery(card))}&LH_Sold=1&LH_Complete=1`;
