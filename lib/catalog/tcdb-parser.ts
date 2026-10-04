import { load } from "cheerio";
import type { CatalogSet } from "./types";
import type { PublishedGroup } from "./checklist-parser";
import type { ChecklistEntry } from "../set-completion";
export function tcdbProduct(title: string): Omit<CatalogSet, "url"> | null {
  const match = /^((?:19|20)\d{2})(?:[-–](\d{2}|(?:19|20)\d{2}))?\s+(.+)$/.exec(title.trim());
  if (!match || / - /.test(match[3])) return null;
  const manufacturer = /^(Upper Deck|O-Pee-Chee|Topps|Bowman|Panini|Donruss|Fleer|Leaf|Score|Pinnacle|Pacific)\b/i.exec(match[3]);
  if (!manufacturer) return null;
  const name = manufacturer[1];
  const brand = /^O-Pee-Chee$/i.test(name) ? "Upper Deck" : name;
  const body = match[3].slice(name.length).trim();
  let set = /^O-Pee-Chee$/i.test(name) ? [name, body].filter(Boolean).join(" ") : body || (/^Topps$/i.test(name) ? "Base" : name);
  if (/^tim horton['’]?s$/i.test(set)) set = "Tim Hortons";
  return { year: match[2] ? `${match[1]}-${match[2].slice(-2)}` : match[1], brand, set };
}
export function parseTcdbSets(html: string): CatalogSet[] {
  const $ = load(html), sets = new Map<string, CatalogSet>();
  $('a[href^="/ViewSet.cfm/sid/"]').each((_, element) => {
    const href = $(element).attr("href") || "";
    if (!/^\/ViewSet\.cfm\/sid\/\d+\/[A-Za-z0-9%_.-]+$/.test(href)) return;
    const product = tcdbProduct($(element).text());
    if (!product) return;
    const url = "https://www.tcdb.com" + href.replace("/ViewSet.cfm/", "/Checklist.cfm/");
    sets.set(url, { ...product, url });
  });
  return [...sets.values()];
}
export function parseTcdbChecklist(html: string, sid: string) {
  const $ = load(html), entries = new Map<string, ChecklistEntry>();
  $(`a[href^="/ViewCard.cfm/sid/${sid}/cid/"]`).each((_, element) => {
    const number = $(element).text().trim();
    if (!number || number.length > 40 || !/^[A-Za-z0-9][A-Za-z0-9.\/-]*$/.test(number)) return;
    const row = $(element).closest("tr");
    const names = [...new Set(row.find('a[href^="/Person.cfm/"]').map((_, e) => $(e).text().trim()).get())];
    if (!names.length) {
      const description = row.find('td[width="45%"],td[width="50%"]').first().text().replace(/\s+/g, " ").trim();
      if (description) names.push(description.replace(/\s+(RC|AU|MEM)\b.*$/, ""));
    }
    const teams = [...new Set(row.find('a[href^="/Team.cfm/"]').map((_, e) => $(e).text().trim()).get())];
    if (!names.length || names.join(" / ").length > 150 || teams.join(" / ").length > 150) return;
    const flags = row.find("td").map((_, cell) => $(cell).text()).get().join(" ");
    entries.set(number.toUpperCase(), { number, player: names.join(" / "), team: teams.join(" / "), subset: "", parallel: "", rookie: /\bRC\b/.test(flags), autograph: /\bAU\b/.test(flags), relicPatch: /\bMEM\b/.test(flags) });
  });
  const pages = $('a[href]').map((_, e) => {
    const href = $(e).attr("href") || "";
    return /^\?PageIndex=\d+$/.test(href) ? Number(href.slice(11)) : 1;
  }).get();
  return { entries: [...entries.values()], pages: Math.max(1, ...pages) };
}
export function tcdbGroups(entries: ChecklistEntry[]): PublishedGroup[] {
  const numbers = new Set(entries.map(entry => entry.number.toUpperCase()));
  // TCDB appends a/b/c to distinguish alternate images of the same printed number.
  // Their actual parallel identity is not available in this table: do not import
  // them as extra base cards or invent a variant name.
  const base = entries.filter(entry => {
    const alternate = /^(\d+)[a-z]+$/i.exec(entry.number);
    return !alternate || !numbers.has(alternate[1]);
  });
  return base.length ? [{ id: "base-complete", label: "Complete published set", subset: "", parallel: "", entries: base }] : [];
}
