export type Sport = "Hockey" | "Baseball";
export type GradingCompany = "" | "PSA" | "BGS" | "SGC" | "CGC" | "Other";
export type ViewMode = "list" | "grid";
export type SortKey = "newest" | "oldest" | "playerAsc" | "yearDesc" | "valueDesc";

export type CardRecord = {
  id: string;
  sport: Sport;
  player: string;
  year: string;
  brand: string;
  set: string;
  subset: string;
  cardNumber: string;
  team: string;
  rookie: boolean;
  autograph: boolean;
  relicPatch: boolean;
  serialNumber: string;
  parallel: string;
  gradingCompany: GradingCompany;
  grade: string;
  quantity: number;
  estimatedValueCad: number;
  notes: string;
  frontImage: string;
  backImage: string;
  createdAt: string;
  updatedAt: string;
};

export type Filters = {
  search: string;
  sport: "" | Sport;
  brand: string;
  player: string;
  team: string;
  rookie: "" | "yes" | "no";
  autograph: "" | "yes" | "no";
  relicPatch: "" | "yes" | "no";
  graded: "" | "yes" | "no";
  year: string;
};

export type OcrGuess = {
  sport?: Sport;
  player?: string;
  year?: string;
  brand?: string;
  subset?: string;
  parallel?: string;
  cardNumber?: string;
  team?: string;
  rookie?: boolean;
  autograph?: boolean;
  relicPatch?: boolean;
  serialNumber?: string;
  gradingCompany?: string;
  grade?: string;
};
