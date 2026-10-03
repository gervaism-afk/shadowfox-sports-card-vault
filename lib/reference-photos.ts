import type { CardRecord } from "./types";
export type ReferencePhoto = { title: string; description: string; url: string; source: string; license: string; author: string; side: "front" | "back" };
const plain = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => plain(s).normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/);
export function isCommonsImageUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "upload.wikimedia.org" && !url.username && !url.password && !url.port; } catch { return false; }
}
export function parseCommonsPhotos(data: any): ReferencePhoto[] {
  const result: ReferencePhoto[] = [];
  for (const page of Object.values(data?.query?.pages || {}) as any[]) {
    const info = page.imageinfo?.[0], meta = info?.extmetadata;
    if (!info || !meta || !/^image\/(jpeg|png|webp)$/.test(info.mime || "")) continue;
    const license = plain(meta.LicenseShortName?.value || "");
    if (!/^(CC0|CC BY(?:-SA)? [\d.]+|Public domain)$/i.test(license)) continue;
    let url: URL, source: URL;
    try { url = new URL(info.url); source = new URL(info.descriptionurl); } catch { continue; }
    if (!isCommonsImageUrl(url.href) || source.protocol !== "https:" || source.hostname !== "commons.wikimedia.org" || source.username || source.password || source.port) continue;
    const description = plain(meta.ImageDescription?.value || "").slice(0, 2000);
    const identity = tokens(page.title + " " + description);
    const front = identity.includes("front"), back = identity.includes("back") || identity.includes("reverse");
    if (front === back) continue;
    result.push({ title: plain(page.title).slice(0, 300), description, url: url.href, source: source.href, license, author: plain(meta.Artist?.value || "See source page").slice(0, 300), side: front ? "front" : "back" });
  }
  return result;
}
export function matchingReferencePhotos(card: CardRecord, photos: ReferencePhoto[]) {
  if (!card.player || !card.year || !card.brand || !card.set || !card.cardNumber || card.serialNumber || card.gradingCompany) return [];
  return photos.filter(photo => {
    const text = tokens(photo.title + " " + photo.description);
    const searchable = (photo.title + " " + photo.description).normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[–—]/g, "-");
    const number = card.cardNumber.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`(?<![a-z0-9-])${number}(?![a-z0-9-])`).test(searchable)) return false;
    if (!card.subset && !card.parallel && !text.includes("base")) return false;
    const required = [card.player, card.year, card.brand, card.set, card.cardNumber, card.subset, card.parallel].filter(Boolean).flatMap(tokens);
    if (!required.every(t => text.includes(t))) return false;
    const requested = tokens(card.subset + " " + card.parallel);
    if (["gold", "silver", "rainbow", "red", "blue", "green", "black", "refractor", "canvas", "script", "battles"].some(t => text.includes(t) && !requested.includes(t))) return false;
    if (text.includes("autograph") !== card.autograph || text.some(t => ["relic", "patch", "jersey"].includes(t)) !== card.relicPatch) return false;
    return true;
  });
}
export function fillReferencePhotos(card: CardRecord, photos: ReferencePhoto[]) {
  const matches = matchingReferencePhotos(card, photos);
  let next = { ...card }, added = 0;
  for (const side of ["front", "back"] as const) {
    const key = side === "front" ? "frontImage" : "backImage";
    const options = matches.filter(photo => photo.side === side);
    // Ambiguous matches stay blank for manual review.
    if (next[key] || options.length !== 1) continue;
    const photo = options[0]; next[key] = photo.url; added++;
    next.notes += `${next.notes ? "\n" : ""}Reference ${side} image (not a photo of this copy): ${photo.title} — ${photo.author}; ${photo.license}; ${photo.source}`;
  }
  return { card: next, added };
}
export async function findReferencePhotos(card: Pick<CardRecord, "year" | "brand" | "set">, signal?: AbortSignal): Promise<ReferencePhoto[]> {
  const params = new URLSearchParams({ year: card.year, brand: card.brand, set: card.set });
  const response = await fetch(`/api/catalog/photos?${params}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Reference image source unavailable.");
  return data.photos;
}
