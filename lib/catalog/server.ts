import "server-only";
import { unstable_cache } from "next/cache";
import type { Sport } from "../types";
import type { CardCatalog, CatalogSource } from "./types";
import {
  parseHockeySets,
  parseBaseballSets,
  parseNhlTeams,
  parseMlbTeams,
  parseNhlPlayers,
  parseMlbPlayers,
} from "./parsers";
import saved from "@/data/card-catalog.json";
import { matchesCatalogYear } from "./types";
import { dedupeSets } from "./parsers";
import { parseTcdbSets } from "./tcdb-parser";
import { savedCommunitySets } from "./community-references";
const HOURS = 6 * 60 * 60;
const urls = {
  nhlTeams: "https://api.nhle.com/stats/rest/en/team",
  nhlPlayers:
    "https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=5000&q=*&active=true",
  mlbTeams:
    "https://statsapi.mlb.com/api/v1/teams?sportId=1&fields=teams,id,name",
  upperDeck:
    "https://upperdeck.com/wp-json/wp/v2/checklist?per_page=100&checklist-category=269&checklist-license=344&_fields=title,link,class_list",
};
async function json(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "ShadowFox-Cards/1.0 (public card-entry reference)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Source unavailable");
  const data = await response.json();
  return { data, checkedAt: new Date().toISOString(), totalPages: Math.min(5,Number(response.headers.get("x-wp-totalpages"))||1) };
}
async function hockeyIndex(url:string) {
 const first=await json(url);
 const rest=await Promise.all(Array.from({length:first.totalPages-1},(_,i)=>json(url+`&page=${i+2}`)));
 return {...first,data:[...first.data,...rest.flatMap(r=>r.data)]};
}
async function baseballIndex(url:string) {
 const first=await json(url);let data=first.data;const rows=[...(data.query?.allpages||[])];
 for(let page=1;page<5&&data.continue?.apcontinue;page++){
  const next=await json(url+'&apcontinue='+encodeURIComponent(data.continue.apcontinue));data=next.data;rows.push(...(data.query?.allpages||[]));
 }
 return {...first,data:{query:{allpages:rows}}};
}
// Cached results are shared across visitors. Source failures retain Next's last successful result;
// a bundled, dated reference copy covers a cold-cache outage without inventing new sets.
const league = unstable_cache(
  async (sport: Sport) => {
    const [teams, players] = await Promise.all([
      json(sport === "Hockey" ? urls.nhlTeams : urls.mlbTeams),
      json(
        sport === "Hockey"
          ? urls.nhlPlayers
          : `https://statsapi.mlb.com/api/v1/sports/1/players?season=${new Date().getUTCFullYear()}&fields=people,id,fullName,currentTeam,name`,
      ),
    ]);
    const names =
      sport === "Hockey"
        ? parseNhlTeams(teams.data)
        : parseMlbTeams(teams.data);
    const people =
      sport === "Hockey"
        ? parseNhlPlayers(players.data, teams.data)
        : parseMlbPlayers(players.data, teams.data);
    if (!names.length || !people.length)
      throw new Error("No league reference returned");
    return { teams: names, players: people, checkedAt: teams.checkedAt };
  },
  ["card-catalog-league-v1"],
  { revalidate: HOURS, tags: ["card-catalog"] },
);
const primarySets = unstable_cache(
  async (sport: Sport, year: string) => {
    const current = new Date().getUTCFullYear();
    const url =
      sport === "Hockey"
        ? `${urls.upperDeck}${year ? `&search=${encodeURIComponent(year.slice(0, 4))}` : ""}`
        : `https://baseballcardpedia.com/api.php?action=query&list=allpages&apfrom=${year || current}&apto=${Number(year || current) + 1}&aplimit=500&format=json`;
    if (sport === "Hockey" && /^\d{4}$/.test(year)) {
      const responses = await Promise.all([
        hockeyIndex(url),
        hockeyIndex(`${urls.upperDeck}&search=${Number(year) - 1}`),
      ]);
      return {
        sets: dedupeSets(
          responses.flatMap((response) => parseHockeySets(response.data)),
        ).filter((row) => matchesCatalogYear(row.year, year, sport)),
        checkedAt: responses[0].checkedAt,
      };
    }
    const response = await (sport === "Hockey" ? hockeyIndex(url) : baseballIndex(url));
    const rows =
      sport === "Hockey"
        ? parseHockeySets(response.data)
        : parseBaseballSets(response.data);
    return { sets: rows, checkedAt: response.checkedAt };
  },
  ["card-catalog-sets-v3"],
  { revalidate: HOURS, tags: ["card-catalog"] },
);
const communitySets = unstable_cache(async (sport: Sport, year: string) => {
  try {
  const start = /^\d{4}/.exec(year)?.[0] || String(new Date().getUTCFullYear());
  const response = await fetch(`https://www.tcdb.com/ViewAll.cfm/sp/${sport}/year/${start}`, { headers: { "User-Agent": "ShadowFox-Cards/1.0 (public checklist reference)" }, signal: AbortSignal.timeout(6000), redirect: "error" });
  if (!response.ok) throw new Error("Community source unavailable");
  const html = await response.text();
  if (html.length > 4 * 1024 * 1024) throw new Error("Community index is too large");
  const sets = parseTcdbSets(html).filter(row => matchesCatalogYear(row.year, year, sport));
  if (!sets.length) throw new Error("No community sets found");
  return { sets, checkedAt: new Date().toISOString(), status: "live" as const };
  } catch (error) {
    const reference = savedCommunitySets(sport, year);
    if (reference.sets.length) return reference;
    throw error;
  }
}, ["tcdb-set-index-v3"], { revalidate: 86400, tags: ["card-catalog"] });
export async function getCardCatalog(
  sport: Sport,
  year: string,
  setsOnly = false,
): Promise<CardCatalog> {
  const fallback = saved[sport];
  const [people, products, community] = await Promise.allSettled([
    setsOnly
      ? Promise.resolve({ teams: [], players: [], checkedAt: saved.checkedAt })
      : league(sport),
    primarySets(sport, year),
    communitySets(sport, year),
  ]);
  const sources: CatalogSource[] = [];
  if (!setsOnly)
    sources.push({
      name:
        sport === "Hockey"
          ? "NHL player and team listings"
          : "MLB player and team listings",
      url: sport === "Hockey" ? "https://www.nhl.com/" : "https://www.mlb.com/",
      checkedAt:
        people.status === "fulfilled"
          ? people.value.checkedAt
          : saved.checkedAt,
      status: people.status === "fulfilled" ? "live" : "saved",
      note: "Current league listings. Use the team printed on older cards.",
    });
  sources.push({
    name:
      sport === "Hockey"
        ? "Upper Deck NHL checklists"
        : "BaseballCardPedia set listings",
    url:
      sport === "Hockey"
        ? "https://upperdeck.com/checklists/"
        : "https://baseballcardpedia.com/",
    checkedAt:
      products.status === "fulfilled"
        ? products.value.checkedAt
        : saved.checkedAt,
    status: products.status === "fulfilled" ? "live" : "saved",
  });
  sources.push({ name: "Trading Card Database set checklists", url: "https://www.tcdb.com/", checkedAt: community.status === "fulfilled" ? community.value.checkedAt : new Date().toISOString(), status: community.status === "fulfilled" ? community.value.status : "saved", note: community.status === "fulfilled" && community.value.status === "saved" ? "Dated reference copies keep supported sets available when the live source cannot be reached." : community.status === "fulfilled" ? "Community reference supplements published coverage; duplicate sets prefer the primary source." : "Community source unavailable; primary and saved references remain available." });
  return {
    sport,
    teams: people.status === "fulfilled" ? people.value.teams : fallback.teams,
    players:
      people.status === "fulfilled" ? people.value.players : fallback.players,
    sets: dedupeSets([...(community.status === "fulfilled" ? community.value.sets : []), ...(
      products.status === "fulfilled"
        ? products.value.sets
        : fallback.sets.filter((row) =>
            matchesCatalogYear(row.year, year, sport),
          ))]),
    sources,
  };
}
