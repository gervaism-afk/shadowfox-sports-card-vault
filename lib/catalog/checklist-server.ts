import "server-only";
import { unstable_cache } from "next/cache";
import { load } from "cheerio";
import {
  parseUpperDeckChecklist,
  parseBaseballChecklist,
  type PublishedChecklist,
} from "./checklist-parser";
import { parseHockeySets, parseBaseballSets } from "./parsers";
import { parseTcdbChecklist, tcdbGroups, tcdbProduct } from "./tcdb-parser";
export function checklistUrl(value: string, sport: string) {
  const url = new URL(value);
  if (
    url.hostname === "www.tcdb.com" &&
    /^\/Checklist\.cfm\/sid\/\d+\/[A-Za-z0-9%_.-]+$/.test(url.pathname)
  ) return url;
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Choose a published checklist from the set menu.");
  if (
    sport === "Hockey" &&
    url.hostname === "upperdeck.com" &&
    /^\/checklist\/[a-z0-9-]+\/$/.test(url.pathname)
  )
    return url;
  if (
    sport === "Baseball" &&
    url.hostname === "baseballcardpedia.com" &&
    /^\/index\.php\/(?:18|19|20)\d{2}_[^/]+$/.test(url.pathname)
  )
    return url;
  throw new Error("This checklist source is not supported.");
}
async function fetchText(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      "User-Agent": "ShadowFox-Cards/1.0 (public card-entry reference)",
    },
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      "The published checklist is temporarily unavailable. Try again later.",
    );
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No checklist returned.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 12 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Checklist source is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export const getPublishedChecklist = unstable_cache(
  async (
    sport: "Hockey" | "Baseball",
    sourceUrl: string,
  ): Promise<PublishedChecklist> => {
    const url = checklistUrl(sourceUrl, sport);
    let year = "",
      brand = "",
      set = "",
      groups;
    if (url.hostname === "www.tcdb.com") {
      const html = await fetchText(url.href), $ = load(html);
      const title = $("title").text().replace(/ (?:Hockey|Baseball) Checklist \| Trading Card Database$/, "").trim();
      if (!$("title").text().includes(`${sport} Checklist | Trading Card Database`)) throw new Error("This checklist does not match the selected sport.");
      const product = tcdbProduct(title);
      if (!product) throw new Error("Could not verify this set's year and brand.");
      ({ year, brand, set } = product);
      const sid = url.pathname.split("/")[3], first = parseTcdbChecklist(html, sid);
      if (first.pages > 10) throw new Error("This source exceeds the supported 1,000-card limit. Choose a smaller checklist section.");
      const entries = [...first.entries];
      for (let page = 2; page <= first.pages; page += 3) {
        const pages = Array.from({ length: Math.min(3, first.pages - page + 1) }, (_, offset) => page + offset);
        const parts = await Promise.all(pages.map(async number => parseTcdbChecklist(await fetchText(`${url.href}?PageIndex=${number}`), sid)));
        for (const part of parts) {
          if (!part.entries.length) throw new Error("A checklist page is unavailable. Try again later.");
          entries.push(...part.entries);
        }
      }
      if (new Set(entries.map(e => e.number.toUpperCase())).size !== entries.length) throw new Error("Checklist pagination returned duplicate card numbers.");
      groups = tcdbGroups(entries);
    } else if (sport === "Hockey") {
      const html = await fetchText(url.href);
      const $ = load(html);
      const title =
        $("h1").first().text() ||
        $("title")
          .text()
          .replace(/ - Upper Deck$/, "");
      const product = parseHockeySets([
        {
          title: { rendered: title },
          link: url.href,
          class_list: ["checklist-category-hockey", "checklist-license-nhl"],
        },
      ])[0];
      if (!product) throw new Error("Could not verify this NHL release.");
      ({ year, brand, set } = product);
      groups = parseUpperDeckChecklist(html);
    } else {
      const title = decodeURIComponent(
        url.pathname.slice("/index.php/".length),
      ).replace(/_/g, " ");
      const body = JSON.parse(
        await fetchText(
          `https://baseballcardpedia.com/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json`,
        ),
      );
      const product = parseBaseballSets({
        query: { allpages: [{ title: body.parse?.title }] },
      })[0];
      if (!product) throw new Error("Could not verify this baseball release.");
      ({ year, brand, set } = product);
      groups = parseBaseballChecklist(body.parse?.text?.["*"] || "");
    }
    if (!groups.length)
      throw new Error(
        "A card-level checklist is not published in a supported format for this release yet.",
      );
    return {
      sport,
      year,
      brand,
      set,
      url: url.href,
      source:
        url.hostname === "www.tcdb.com" ? "Trading Card Database community checklist" : sport === "Hockey"
          ? "Upper Deck published checklist"
          : "BaseballCardPedia published checklist",
      checkedAt: new Date().toISOString(),
      groups,
    };
  },
  ["published-card-checklist-v4"],
  { revalidate: 6 * 60 * 60, tags: ["card-catalog"] },
);
