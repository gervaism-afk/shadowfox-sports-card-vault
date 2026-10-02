"use client";

import VaultIcon from "@/components/VaultIcon";
import { defaultFilters } from "@/lib/defaults";
import { normalizeOption, optionValues } from "@/lib/catalog/types";
import { filterCards } from "@/lib/utils";
import { CardRecord, Filters, SortKey, ViewMode } from "@/lib/types";

export default function CollectionControls({ cards, filters, setFilters, sortKey, setSortKey, viewMode, setViewMode }: { cards: CardRecord[]; filters: Filters; setFilters: (next: Filters) => void; sortKey: SortKey; setSortKey: (next: SortKey) => void; viewMode: ViewMode; setViewMode: (next: ViewMode) => void; }) {
  const patch = (key: keyof Filters, value: string) => setFilters({ ...filters, [key]: value });
  const activeAdvanced = Object.entries(filters).filter(([key, value]) => key !== "sport" && key !== "search" && !!value).length;
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <section aria-label="Collection filters">
      <div className="vaultToolbar">
        <label className="vaultSearch">
          <VaultIcon name="search" size={18} />
          <input type="search" aria-label="Search your collection" placeholder="Find a player, team, or card…" value={filters.search} onChange={(e) => patch("search", e.target.value)} />
        </label>
        <div className="vaultSportChips" role="group" aria-label="Filter by sport">
          {(["", "Hockey", "Baseball"] as const).map((sport) => <button className={`vaultSportChip${filters.sport === sport ? " active" : ""}`} key={sport || "all"} type="button" aria-pressed={filters.sport === sport} onClick={() => patch("sport", sport)}>{sport || "All sports"}</button>)}
        </div>
      </div>
      <p className="helperText">Combine player, team, brand, year, set and variation filters. Print and export can use only the matching cards.</p>
      <div className="vaultControlRow">
        <details className="vaultAdvancedFilters">
          <summary><VaultIcon name="filter" size={16} />Filters{activeAdvanced ? ` (${activeAdvanced})` : ""}</summary>
          <div className="vaultFilterGrid">
            {([['player','Player'],['team','Team'],['brand','Brand'],['year','Year'],['set','Set'],['subset','Subset'],['parallel','Variation / parallel']] as const).map(([key,label]) => {
              const context=filterCards(cards,{...filters,[key]:''});
              const options=optionValues(context.map(card=>card[key])).filter(option=>!filters[key]||normalizeOption(option)!==normalizeOption(filters[key]));
              if(filters[key])options.push(filters[key]);
              options.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
              if(key==='year')options.reverse();
              return <label key={key}>{label}<select aria-label={label} className="input" value={filters[key]} onChange={e=>patch(key,e.target.value)}><option value="">Any {label.toLowerCase()}</option>{options.map(option=><option value={option} key={option}>{option}</option>)}</select></label>;
            })}
            <label>Rookie<select aria-label="Rookie" className="input" value={filters.rookie} onChange={(e) => patch("rookie", e.target.value)}><option value="">Any</option><option value="yes">Rookie cards</option><option value="no">Non-rookie cards</option></select></label>
            <label>Autograph<select aria-label="Autograph" className="input" value={filters.autograph} onChange={(e) => patch("autograph", e.target.value)}><option value="">Any</option><option value="yes">Autographed</option><option value="no">No autograph</option></select></label>
            <label>Relic or patch<select aria-label="Relic or patch" className="input" value={filters.relicPatch} onChange={(e) => patch("relicPatch", e.target.value)}><option value="">Any</option><option value="yes">Relic / patch cards</option><option value="no">No relic / patch</option></select></label>
            <label>Grading<select aria-label="Grading" className="input" value={filters.graded} onChange={(e) => patch("graded", e.target.value)}><option value="">Any</option><option value="yes">Graded cards</option><option value="no">Ungraded cards</option></select></label>
          </div>
        </details>
        {hasFilters ? <button className="vaultTextButton" type="button" onClick={() => setFilters({ ...defaultFilters })}>Clear filters</button> : null}
        <div className="vaultViewSwitcher" role="group" aria-label="Collection view">
          <button className={viewMode === "grid" ? "active" : ""} type="button" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}><VaultIcon name="grid" size={16} />Gallery</button>
          <button className={viewMode === "list" ? "active" : ""} type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>List</button>
        </div>
        <label className="vaultSortControl">Sort<select aria-label="Sort collection" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}><option value="newest">Recently added</option><option value="oldest">Oldest first</option><option value="playerAsc">Player A–Z</option><option value="yearDesc">Year: newest first</option><option value="valueDesc">Highest estimate</option></select></label>
      </div>
      {hasFilters?<div className="activeFilterTags" aria-label="Active collection filters">{Object.entries(filters).filter(([,value])=>!!value).map(([key,value])=><button type="button" key={key} aria-label={`Remove ${key} filter`} onClick={()=>patch(key as keyof Filters,'')}>{key==='search'?'Search':key==='relicPatch'?'Relic/patch':key==='graded'?'Grading':key.charAt(0).toUpperCase()+key.slice(1)}: {value} <span aria-hidden="true">×</span></button>)}</div>:null}
    </section>
  );
}
