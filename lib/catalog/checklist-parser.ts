import { load } from "cheerio";
import { normalizeOption } from "./types";
import type { ChecklistEntry } from "../set-completion";
export type PublishedGroup = {
  id: string;
  label: string;
  subset: string;
  parallel: string;
  entries: ChecklistEntry[];
  count?: number;
};
export type PublishedChecklist = {
  sport: "Hockey" | "Baseball";
  year: string;
  brand: string;
  set: string;
  url: string;
  source: string;
  checkedAt: string;
  groups: PublishedGroup[];
};
function text(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 150);
}
function scope(label: string) {
  let subset = label.replace(/^Base Set(?: - )?/i, "").trim(),
    parallel = "";
  const flagship =
    /^(Ice Battles|Silver Script|Gold Script|Super Script Black|Super Script|Magenta Auto|Clear Cut|Deluxe|Exclusives|High Gloss|Outburst(?: Red| Gold)?|Printing Plates|Oversized) Parallel(?: - (.*))?$/i.exec(
      label,
    );
  if (flagship) {
    parallel = flagship[1];
    subset = flagship[2] || "";
  } else {
    const p =
      /^(.*?)\s+(Super Script Black|Super Script|Silver Script|Gold Script|Black and White|Printing Plates|Speckle|Sparkle|Red|Gold|Blue|Green|Black|Orange|Pink|Purple|Silver) Parallel(?: - (.*))?$/i.exec(
        label,
      );
    if (p) {
      subset = [p[1], p[3]].filter(Boolean).join(" ");
      parallel = p[2];
    }
  }
  subset = subset.replace(/ - /g, " ");
  return { subset, parallel };
}
function unique(entries: ChecklistEntry[]) {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = e.number.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function parseUpperDeckChecklist(html: string): PublishedGroup[] {
  const $ = load(html);
  const rows = new Map<string, ChecklistEntry[]>();
  $("table.csv-table").each((_, table) => {
    const headers = $(table)
      .find("thead th")
      .map((_, e) => text($(e).text()))
      .get();
    const indexes = [
      "Set Name",
      "Card",
      "Description",
      "Team City",
      "Team Name",
    ].map((name) =>
      headers.findIndex((h) =>
        normalizeOption(h) === normalizeOption(name) ||
        (name === "Description" && normalizeOption(h) === "decription"),
      ),
    );
    if (indexes.slice(0, 3).some((i) => i < 0)) return;
    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const cells = $(row)
          .find("td")
          .map((_, e) => text($(e).text()))
          .get();
        const [label, number, player] = indexes
          .slice(0, 3)
          .map((i) => cells[i] || "");
        if (!label || !number || number.length > 40 || !player) return;
        const { subset, parallel } = scope(label);
        const team = indexes
          .slice(3)
          .map((i) => (i >= 0 ? cells[i] : ""))
          .filter(Boolean)
          .join(" ");
        const entries = rows.get(label) || [];
        entries.push({
          number,
          player,
          team,
          subset,
          parallel,
          rookie: !!cells[headers.indexOf("Rookie")] && !/^(no|false|0|n|-)$/.test(cells[headers.indexOf("Rookie")].toLowerCase()),
          autograph: !!cells[headers.indexOf("Auto")] && !/^(no|false|0|n|-)$/.test(cells[headers.indexOf("Auto")].toLowerCase()),
          relicPatch: /jersey|patch|memorabilia|relic/i.test(
            cells[headers.findIndex(h=>/^(Mem|Mem\/Tech)$/i.test(h))] || "",
          ),
        });
        rows.set(label, entries);
      });
  });
  const groups = [...rows]
    .map(([label, entries], i) => ({
      id: `ud-${i}`,
      label,
      ...scope(label),
      entries: unique(entries),
    }))
    .filter((g) => g.entries.length && g.entries.length <= 2000);
  const base = groups.filter(
    (g) => /^Base Set(?: -|$)/i.test(g.label) && !g.parallel,
  );
  const all = base.flatMap((g) => g.entries);
  if (all.length && all.length <= 2000 && unique(all).length === all.length)
    groups.unshift({
      id: "base-complete",
      label: "Complete base set",
      subset: "",
      parallel: "",
      entries: all,
    });
  return groups;
}
export function parseBaseballChecklist(html: string): PublishedGroup[] {
  const $ = load(html);
  let category='', parent='', child='';
  const groups = new Map<string, PublishedGroup>();
  const base:ChecklistEntry[]=[];
  const nodes = $(".mw-parser-output").length ? $(".mw-parser-output").find("h2,h3,h4,ul[style]") : $("h2,h3,h4,ul[style]");
  nodes.each((_,node)=>{
    const element=$(node),tag=node.tagName;
    if(/^h[234]$/.test(tag)){
      const label=text(element.clone().find('.mw-editsection').remove().end().text());
      if(tag==='h2'){category=label;parent='';child='';}else if(tag==='h3'){parent=label;child='';}else child=label;
      return;
    }
    const isBase=/^(Base Set|Base Cards|Checklist)$/i.test(category);
    const special=/gimmick|variation|short.print|error/i.test(parent+' '+child);
    const supported=isBase||/^(Inserts|Parallels|Autographs|Relics|Manufactured Relics|Autographed Relics)$/i.test(category);
    if(!supported||(!isBase&&!parent))return;
    const label=[parent,child].filter(Boolean).join(' · ')||category;
    // A published numbered list is required. Paragraphs and unnumbered parallel descriptions
    // are not expanded into assumed copies of the base checklist.
    let subset=isBase&&!special&&/^(Series (?:One|Two|1|2))?$/i.test(parent)?'':[parent,child].filter(Boolean).join(' ');
    let parallel='';
    if(category==='Parallels'){
      subset=child?parent:'';parallel=child||parent;
    }else if(isBase&&special){subset='';parallel=[parent,child].filter(Boolean).join(' ');}
    const entries:ChecklistEntry[]=[];
    element.children('li').each((_,li)=>{
      const raw=text($(li).text());const m=/^([A-Za-z0-9][A-Za-z0-9.\-]{0,39})\s+(.+)$/.exec(raw);
      if(!m||(!/\d/.test(m[1])&&!/^[A-Z0-9]+-[A-Z0-9]+$/i.test(m[1])))return;
      const player=m[2].replace(/\s+(?:RC|LL|TC|SP|CL)(?:\s+(?:RC|LL|TC|SP|CL))*\s*$/,'').trim();
      if(!player)return;
      entries.push({number:m[1],player,team:'',subset,parallel,...(/\bRC\b/.test(m[2])?{rookie:true}:{}),...(/autograph/i.test(category)?{autograph:true}:{}),...(/relic/i.test(category)?{relicPatch:true}:{})});
    });
    if(!entries.length)return;
    const key=category+'|'+label;const saved=groups.get(key);
    groups.set(key,{id:'',label:(!isBase?category+' · ':'')+label,subset,parallel,entries:[...(saved?.entries||[]),...entries]});
    if(isBase&&!special)base.push(...entries);
  });
  const result=[...groups.values()].map((g,i)=>({...g,id:`mlb-${i}`,entries:unique(g.entries)})).filter(g=>g.entries.length&&g.entries.length<=2000);
  if(base.length&&base.length<=2000&&unique(base).length===base.length)result.unshift({id:'base-complete',label:'Complete base set',subset:'',parallel:'',entries:base});
  return result;
}
