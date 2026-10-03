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
  return { data, checkedAt: new Date().toISOString() };
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
const sets = unstable_cache(
  async (sport: Sport, year: string) => {
    const current = new Date().getUTCFullYear();
    const url =
      sport === "Hockey"
        ? `${urls.upperDeck}${year ? `&search=${encodeURIComponent(year.slice(0, 4))}` : ""}`
        : `https://baseballcardpedia.com/api.php?action=query&list=allpages&apfrom=${year || current}&apto=${Number(year || current) + 1}&aplimit=500&format=json`;
    if (sport === "Hockey" && /^\d{4}$/.test(year)) {
      const responses = await Promise.all([
        json(url),
        json(`${urls.upperDeck}&search=${Number(year) - 1}`),
      ]);
      return {
        sets: dedupeSets(
          responses.flatMap((response) => parseHockeySets(response.data)),
        ).filter((row) => matchesCatalogYear(row.year, year, sport)),
        checkedAt: responses[0].checkedAt,
      };
    }
    const response = await json(url);
    const rows =
      sport === "Hockey"
        ? parseHockeySets(response.data)
        : parseBaseballSets(response.data);
    return { sets: rows, checkedAt: response.checkedAt };
  },
  ["card-catalog-sets-v2"],
  { revalidate: HOURS, tags: ["card-catalog"] },
);
export async function getCardCatalog(
  sport: Sport,
  year: string,
  setsOnly = false,
): Promise<CardCatalog> {
  const fallback = saved[sport];
  const [people, products] = await Promise.allSettled([
    setsOnly
      ? Promise.resolve({ teams: [], players: [], checkedAt: saved.checkedAt })
      : league(sport),
    sets(sport, year),
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
  return {
    sport,
    teams: people.status === "fulfilled" ? people.value.teams : fallback.teams,
    players:
      people.status === "fulfilled" ? people.value.players : fallback.players,
    sets:
      products.status === "fulfilled"
        ? products.value.sets
        : fallback.sets.filter((row) =>
            matchesCatalogYear(row.year, year, sport),
          ),
    sources,
  };
}
