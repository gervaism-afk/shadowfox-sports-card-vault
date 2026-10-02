import type { CardRecord, Filters } from "@/lib/types";

export const defaultFilters: Filters = {
  search: "", set: "", subset: "", parallel: "", sport: "", brand: "", player: "", team: "", rookie: "",
  autograph: "", relicPatch: "", graded: "", year: "",
};

export function emptyCard(): CardRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), sport: "Hockey", player: "", year: "", brand: "",
    set: "", subset: "", cardNumber: "", team: "", rookie: false,
    autograph: false, relicPatch: false, serialNumber: "", parallel: "",
    gradingCompany: "", grade: "", quantity: 1, estimatedValueCad: 0,
    notes: "", frontImage: "", backImage: "", createdAt: now, updatedAt: now,
  };
}
