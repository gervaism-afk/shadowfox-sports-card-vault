"use client";

import { Filters, SortKey, ViewMode } from "@/lib/types";

export default function CollectionControls({ filters, setFilters, sortKey, setSortKey, viewMode, setViewMode }: { filters: Filters; setFilters: (next: Filters) => void; sortKey: SortKey; setSortKey: (next: SortKey) => void; viewMode: ViewMode; setViewMode: (next: ViewMode) => void; }) {
  const patch = (key: keyof Filters, value: string) => setFilters({ ...filters, [key]: value });

  return (
    <section className="premiumControls">
      <div className="controlsTop">
        <input className="input" placeholder="Smart search" value={filters.search} onChange={(e) => patch("search", e.target.value)} />
        <div className="segmented">
          <button className={viewMode === "list" ? "active" : ""} type="button" onClick={() => setViewMode("list")}>List</button>
          <button className={viewMode === "grid" ? "active" : ""} type="button" onClick={() => setViewMode("grid")}>Grid</button>
        </div>
        <select className="input narrow" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="playerAsc">Player A-Z</option>
          <option value="yearDesc">Year Newest-Oldest</option>
          <option value="valueDesc">Value Highest-Lowest</option>
        </select>
      </div>
      <div className="controlsGrid">
        <select className="input" value={filters.sport} onChange={(e) => patch("sport", e.target.value)}><option value="">All Sports</option><option value="Hockey">Hockey</option><option value="Baseball">Baseball</option></select>
        <input className="input" placeholder="Player" value={filters.player} onChange={(e) => patch("player", e.target.value)} />
        <input className="input" placeholder="Brand" value={filters.brand} onChange={(e) => patch("brand", e.target.value)} />
        <input className="input" placeholder="Team" value={filters.team} onChange={(e) => patch("team", e.target.value)} />
        <input className="input" placeholder="Year" value={filters.year} onChange={(e) => patch("year", e.target.value)} />
        <select className="input" value={filters.rookie} onChange={(e) => patch("rookie", e.target.value)}><option value="">All Rookie</option><option value="yes">Rookie = Yes</option><option value="no">Rookie = No</option></select>
        <select className="input" value={filters.autograph} onChange={(e) => patch("autograph", e.target.value)}><option value="">All Auto</option><option value="yes">Autograph = Yes</option><option value="no">Autograph = No</option></select>
        <select className="input" value={filters.relicPatch} onChange={(e) => patch("relicPatch", e.target.value)}><option value="">All Relic/Patch</option><option value="yes">Relic/Patch = Yes</option><option value="no">Relic/Patch = No</option></select>
        <select className="input" value={filters.graded} onChange={(e) => patch("graded", e.target.value)}><option value="">All Graded</option><option value="yes">Graded = Yes</option><option value="no">Graded = No</option></select>
      </div>
    </section>
  );
}
