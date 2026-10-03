import type { CardRecord, OcrGuess } from "./types";

export function applyOcrGuess(card: CardRecord, guess: OcrGuess): CardRecord {
  return {
    ...card, sport: guess.sport || card.sport, player: guess.player || "", year: guess.year || "",
    brand: guess.brand || "", set: guess.set || "", subset: guess.subset || "", parallel: guess.parallel || "",
    cardNumber: guess.cardNumber || "", team: guess.team || "", rookie: !!guess.rookie,
    autograph: !!guess.autograph, relicPatch: !!guess.relicPatch, serialNumber: guess.serialNumber || "",
    gradingCompany: (guess.gradingCompany as CardRecord["gradingCompany"]) || "", grade: guess.grade || "",
  };
}
