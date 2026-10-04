import "server-only";
import saved from "@/data/community-checklists.json";
import type { PublishedChecklist } from "./checklist-parser";
import type { Sport } from "../types";
import { matchesCatalogYear } from "./types";
const references = saved.checklists as unknown as Record<string, PublishedChecklist>;
export function savedCommunityChecklist(url: string, sport: Sport) {
  const data = references[url];
  return data?.sport === sport ? data : undefined;
}
export function savedCommunitySets(sport: Sport, year: string) {
  const products = Object.values(references).filter(data => data.sport === sport && matchesCatalogYear(data.year, year, sport));
  return {
    sets: products.map(({ year, brand, set, url }) => ({ year, brand, set, url })),
    checkedAt: products.map(data => data.checkedAt).sort().at(-1) || "",
    status: "saved" as const,
  };
}
