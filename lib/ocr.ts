import { OcrGuess } from "@/lib/types";

const HOCKEY_BRANDS = ["Upper Deck","O-Pee-Chee","OPC","SP Authentic","SPx","Artifacts","MVP","Parkhurst","Score","Ice","Trilogy","UD","Metal Universe","Black Diamond"];
const BASEBALL_BRANDS = ["Topps","Bowman","Panini","Donruss","Fleer","Score","Leaf","Chrome","Stadium Club","Finest","Allen & Ginter","Heritage"];
const SET_TERMS = [
  "Young Guns","Series 1","Series 2","SP Authentic","Future Watch","UD Canvas","Chrome","Bowman Chrome",
  "Topps Chrome","Stadium Club","Heritage","Allen & Ginter","Black Diamond","Metal Universe","Rookie Debut"
];
const PARALLEL_TERMS = [
  "Refractor","Blue Refractor","Gold Refractor","Rainbow Foil","Silver Foil","Red Foil","Canvas",
  "Prizm","Mojo","X-Fractor","Green","Blue","Red","Gold","Purple","Pink","Orange","Black"
];
const TEAMS = [
  "Maple Leafs","Canadiens","Bruins","Red Wings","Oilers","Flames","Canucks","Jets","Rangers","Islanders",
  "Penguins","Flyers","Senators","Avalanche","Lightning","Panthers",
  "Yankees","Blue Jays","Red Sox","Dodgers","Cubs","Mets","Orioles","Braves","Astros","Phillies","Padres"
];

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function findFirst(text: string, terms: string[]) {
  return [...terms].sort((a, b) => b.length - a.length).find((term) => new RegExp(`\\b${esc(term)}\\b`, "i").test(text)) || "";
}
function pickSport(text: string, brand: string): "Hockey" | "Baseball" | undefined {
  if (/NHL|Young Guns|O-Pee-Chee|SP Authentic|SPx|Artifacts|Parkhurst|Future Watch|UD Canvas|Black Diamond/i.test(text)) return "Hockey";
  if (/MLB|Bowman|Topps|Donruss|Chrome|Baseball|Stadium Club|Finest|Allen & Ginter|Heritage/i.test(text)) return "Baseball";
  if (HOCKEY_BRANDS.includes(brand)) return "Hockey";
  if (BASEBALL_BRANDS.includes(brand)) return "Baseball";
  return undefined;
}
function pickYear(text: string) {
  const season = text.match(/\b((?:19|20)\d{2})\s*[-–—]\s*(\d{4}|\d{2})\b/);
  return season ? `${season[1]}-${season[2].slice(-2)}` : (text.match(/\b(19\d{2}|20\d{2})\b/) || [])[0] || "";
}
function pickCardNumber(text: string) {
  return (
    (text.match(/(?:#\s*|No\.?\s*)([A-Z]{0,3}\d{1,4})\b/i) || [])[1] ||
    (text.match(/\bCard\s*([A-Z]{0,3}\d{1,4})\b/i) || [])[1] || ""
  );
}
function pickSerial(text: string) { return (text.match(/\b\d{1,3}\s*\/\s*\d{2,4}\b/) || [])[0] || ""; }
function pickGrade(text: string) {
  const label = text.match(/\b(?:PSA|BGS|SGC|CGC)\s*(?:GEM\s*MINT\s*|MINT\s*|GRADE\s*)?(10|9\.5|9|8\.5|8|7\.5|7)\b/i);
  return label?.[1] || "";
}
function pickPlayer(text: string, brand: string, team: string, subset: string, parallel: string) {
  const ignore = [...HOCKEY_BRANDS, ...BASEBALL_BRANDS, ...SET_TERMS, ...PARALLEL_TERMS, team, brand, subset, parallel,
    "rookie", "authentic", "baseball", "hockey", "series", "card", "NHL", "MLB", "PSA", "BGS", "SGC", "CGC", "GEM MINT"]
    .filter(Boolean);
  for (const line of text.split(/\r?\n/)) {
    let candidate = line;
    for (const term of ignore.sort((a, b) => b.length - a.length)) candidate = candidate.replace(new RegExp(`\\b${esc(term)}\\b`, "gi"), " ");
    candidate = candidate.replace(/[#\d].*$/, "").trim();
    if (!/^[A-Za-zÀ-ž][A-Za-zÀ-ž'’-]+(?:\s+[A-Za-zÀ-ž][A-Za-zÀ-ž'’-]+){1,3}$/.test(candidate)) continue;
    if (candidate === candidate.toUpperCase()) return candidate.toLowerCase().replace(/(?:^|[\s'-])[a-z]/g, (letter) => letter.toUpperCase());
    return candidate;
  }
  return "";
}
export function parseOcrText(text: string): OcrGuess {
  const brand = findFirst(text, [...HOCKEY_BRANDS, ...BASEBALL_BRANDS]);
  const set = findFirst(text, ["MVP", "Series 1", "Series 2", "SP Authentic", "SPx", "Artifacts", "Parkhurst", "Ice", "Trilogy", "Black Diamond", "Metal Universe", "Bowman Chrome", "Topps Chrome", "Stadium Club", "Heritage", "Allen & Ginter"]);
  const subset = findFirst(text, ["Young Guns", "Future Watch", "UD Canvas", "Rookie Debut"]);
  const parallel = findFirst(text, PARALLEL_TERMS);
  const team = findFirst(text, TEAMS);
  const sport = pickSport(text, brand);

  return {
    sport,
    player: pickPlayer(text, brand, team, subset, parallel) || undefined,
    year: pickYear(text) || undefined,
    brand: brand || undefined,
    set: set || undefined,
    subset: subset || undefined,
    parallel: parallel || undefined,
    cardNumber: pickCardNumber(text) || undefined,
    team: team || undefined,
    rookie: /\bRC\b|rookie|Young Guns|Future Watch/i.test(text),
    autograph: /autograph|auto\b|signed/i.test(text),
    relicPatch: /relic|patch|jersey|memorabilia/i.test(text),
    serialNumber: pickSerial(text) || undefined,
    gradingCompany: (text.match(/\b(PSA|BGS|SGC|CGC)\b/i) || [])[1]?.toUpperCase() || undefined,
    grade: pickGrade(text) || undefined,
  };
}
export function computeConfidence(guess: OcrGuess, text: string) {
  let score = 0;
  if (guess.player) score += 0.22;
  if (guess.year) score += 0.14;
  if (guess.brand) score += 0.16;
  if (guess.cardNumber) score += 0.16;
  if (guess.sport) score += 0.08;
  if (guess.subset) score += 0.08;
  if (guess.parallel) score += 0.05;
  if (guess.team) score += 0.04;
  if (guess.serialNumber) score += 0.04;
  if (guess.gradingCompany) score += 0.03;
  if (guess.grade) score += 0.02;
  if ((text || "").length > 30) score += 0.05;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}
