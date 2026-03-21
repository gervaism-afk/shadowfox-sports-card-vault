import { CardRecord, Filters } from "@/lib/types";

export const defaultFilters: Filters = {
  search: "",
  sport: "",
  brand: "",
  player: "",
  team: "",
  rookie: "",
  autograph: "",
  relicPatch: "",
  graded: "",
  year: "",
};

export function emptyCard(): CardRecord {
  return {
    id: crypto.randomUUID(),
    sport: "Hockey",
    player: "",
    year: "",
    brand: "",
    set: "",
    subset: "",
    cardNumber: "",
    team: "",
    rookie: false,
    autograph: false,
    relicPatch: false,
    serialNumber: "",
    parallel: "",
    gradingCompany: "",
    grade: "",
    quantity: 1,
    estimatedValueCad: 0,
    notes: "",
    frontImage: "",
    backImage: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
