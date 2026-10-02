"use client";

import VaultIcon from "@/components/VaultIcon";
import { defaultFilters } from "@/lib/defaults";
import { Filters, SortKey, ViewMode } from "@/lib/types";

export default function CollectionControls({ filters, setFilters, sortKey, setSortKey, viewMode, setViewMode }: { filters: Filters; setFilters: (next: Filters) => void; sortKey: SortKey; setSortKey: (next: SortKey) => void; viewMode: ViewMode; setViewMode: (next: ViewMode) => void; }) {
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
      <div className="vaultControlRow">
        <details className="vaultAdvancedFilters">
          <summary><VaultIcon name="filter" size={16} />Filters{activeAdvanced ? ` (${activeAdvanced})` : ""}</summary>
          <div className="vaultFilterGrid">
            <label>Player<input className="input" value={filters.player} onChange={(e) => patch("player", e.target.value)} placeholder="Any player" /></label>
            <label>Brand<input className="input" value={filters.brand} onChange={(e) => patch("brand", e.target.value)} placeholder="Any brand" /></label>
            <label>Team<input className="input" value={filters.team} onChange={(e) => patch("team", e.target.value)} placeholder="Any team" /></label>
            <label>Year<input className="input" value={filters.year} onChange={(e) => patch("year", e.target.value)} placeholder="Any year" /></label>
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
    </section>
  );
}
