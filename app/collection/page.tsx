"use client";
import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import CollectionControls from "@/components/CollectionControls";
import CollectionTable from "@/components/CollectionTable";
import CollectionGrid from "@/components/CollectionGrid";
import { defaultFilters } from "@/lib/defaults";
import { loadCards } from "@/lib/storage";
import { Filters, SortKey, ViewMode, CardRecord } from "@/lib/types";
import { filterCards, sortCards, totalCards, totalValue, uniqueCards } from "@/lib/utils";

export default function CollectionPage() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [error, setError] = useState("");
  useEffect(() => { loadCards().then(setCards).catch((e) => setError(e.message || "Failed to load collection")); }, []);
  const filtered = useMemo(() => sortCards(filterCards(cards, filters), sortKey), [cards, filters, sortKey]);

  const exportJson = () => { const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "shadowfox-vault-export.json"; a.click(); URL.revokeObjectURL(url); };
  const exportCsv = () => { const headers = ["sport","player","year","brand","set","subset","cardNumber","team","rookie","autograph","relicPatch","serialNumber","parallel","gradingCompany","grade","quantity","estimatedValueCad","notes"]; const rows = filtered.map((c) => headers.map((h) => `"${String((c as any)[h] ?? "").replaceAll('"', '""')}"`).join(",")); const csv = [headers.join(","), ...rows].join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "shadowfox-vault-export.csv"; a.click(); URL.revokeObjectURL(url); };

  return (
    <AuthGate>
      <PageShell title="Collection">
        <div className="collectionShell">
          {error ? <section className="panel" style={{ marginBottom: 16 }}>{error}</section> : null}
          <section className="heroGrid">
            <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Total Cards</div><div className="kpiValue">{totalCards(filtered)}</div></div>
            <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Unique Cards</div><div className="kpiValue">{uniqueCards(filtered)}</div></div>
            <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Estimated Collection Value</div><div className="kpiValue">${totalValue(filtered).toFixed(2)} CAD</div></div>
          </section>
          <section className="premiumControls"><div className="buttonRow" style={{ marginBottom: 0 }}><button className="btn" onClick={exportJson}>Export JSON</button><button className="btn" onClick={exportCsv}>Export CSV</button></div></section>
          <CollectionControls filters={filters} setFilters={setFilters} sortKey={sortKey} setSortKey={setSortKey} viewMode={viewMode} setViewMode={setViewMode} />
          {!filtered.length ? <section className="softPanel emptyState fadeInUp"><div className="emptyStateIcon softPulse">📚</div><div className="emptyStateTitle">Your filtered view is empty</div><div className="emptyStateText">Try changing your search, filters, or add a new card to start building your ShadowFox vault.</div></section> : viewMode === "list" ? <CollectionTable cards={filtered} /> : <CollectionGrid cards={filtered} />}
        </div>
      </PageShell>
    </AuthGate>
  );
}
