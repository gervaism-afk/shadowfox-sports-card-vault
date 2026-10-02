"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/components/AuthProvider";
import VaultIcon from "@/components/VaultIcon";
import CollectionPdfExport from "@/components/CollectionPdfExport";
import CollectionControls from "@/components/CollectionControls";
import CollectionTable from "@/components/CollectionTable";
import CollectionGrid from "@/components/CollectionGrid";
import { defaultFilters } from "@/lib/defaults";
import { loadCards } from "@/lib/storage";
import { Filters, SortKey, ViewMode, CardRecord } from "@/lib/types";
import { filterCards, sortCards, totalCards, totalValue, uniqueCards } from "@/lib/utils";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";

type PageContent = typeof PAGE_CONTENT_DEFAULTS.collection;
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default function CollectionPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [error, setError] = useState("");
  const [cardsLoading, setCardsLoading] = useState(true);
  const [content, setContent] = useState<PageContent>(PAGE_CONTENT_DEFAULTS.collection);

  useEffect(() => {
    let active = true;
    setCards([]);
    setError("");
    setCardsLoading(true);
    if (user) {
      loadCards().then((next) => { if (active) setCards(next); })
        .catch((e) => { if (active) setError(e.message || "Failed to load collection"); })
        .finally(() => { if (active) setCardsLoading(false); });
    }
    return () => { active = false; };
  }, [user?.id]);
  useEffect(() => {
    fetch("/api/content/collection", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setContent({ ...PAGE_CONTENT_DEFAULTS.collection, ...(json?.content || {}) }))
      .catch(() => {});
  }, []);
  const filtered = useMemo(() => sortCards(filterCards(cards, filters), sortKey), [cards, filters, sortKey]);
  const valuedEntries = filtered.filter((card) => Number(card.estimatedValueCad) > 0).length;
  const hasFilters = Object.values(filters).some(Boolean);

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportJson = () => download(new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" }), "shadowfox-vault-export.json");
  const exportCsv = () => {
    const headers = ["sport", "player", "year", "brand", "set", "subset", "cardNumber", "team", "rookie", "autograph", "relicPatch", "serialNumber", "parallel", "gradingCompany", "grade", "quantity", "estimatedValueCad", "notes"] as const;
    const rows = filtered.map((card) => headers.map((header) => `"${String(card[header] ?? "").replaceAll('"', '""')}"`).join(","));
    download(new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" }), "shadowfox-vault-export.csv");
  };

  return (
    <AuthGate>
      <PageShell>
        <section className="vaultWelcome">
          <div><div className="vaultEyebrow">Built around your collection</div><h1 className="vaultDisplayTitle">{content.title}<br /><em>Your story.</em></h1><p className="vaultWelcomeCopy">{content.subtitle}</p></div>
          {!cardsLoading && !error ? <div className="vaultWelcomeStats" aria-label="Collection totals">
            <div className="vaultStat"><strong className="kpiValue">{totalCards(filtered)}</strong><span>Total cards</span></div>
            <div className="vaultStat"><strong>{uniqueCards(filtered)}</strong><span>Unique cards</span></div>
          </div> : null}
        </section>
        {error ? <section className="panel" role="alert">{error}</section> : null}
        <div className="buttonRow organizeNav"><Link className="btn ghost" href="/binders">Binders</Link><Link className="btn ghost" href="/want-list">Want list</Link></div>
        <CollectionControls filters={filters} setFilters={setFilters} sortKey={sortKey} setSortKey={setSortKey} viewMode={viewMode} setViewMode={setViewMode} />
        <div className="vaultSectionHeading">
          <div><h2>{hasFilters ? "Matching cards" : "All cards"}</h2><p className="vaultResultsLabel">{cardsLoading ? "Loading your collection…" : `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}${hasFilters ? ` of ${cards.length}` : ""} in your vault`}</p></div>
          <details className="vaultExport"><summary><VaultIcon name="arrow" size={16} />Export</summary><div><CollectionPdfExport cards={cards} filtered={filtered} disabled={cardsLoading || !!error} /><button type="button" onClick={exportCsv} disabled={cardsLoading || !!error}>{content.exportCsvLabel}</button><button type="button" onClick={exportJson} disabled={cardsLoading || !!error}>{content.exportJsonLabel}</button></div></details>
        </div>
        {!error && (cardsLoading ? <section className="panel" role="status">Loading cards…</section> : !filtered.length ? <section className="vaultEmptyState"><VaultIcon name="binder" size={32} /><h2>{content.emptyTitle}</h2><p>{content.emptyText}</p>{hasFilters ? <button className="btn secondary" type="button" onClick={() => setFilters({ ...defaultFilters })}>Clear filters</button> : <Link className="btn primary" href="/scan"><VaultIcon name="scan" size={18} />Scan your first card</Link>}</section> : viewMode === "list" ? <CollectionTable cards={filtered} /> : <CollectionGrid cards={filtered} />)}
        {!cardsLoading && !error && filtered.length > 0 ? <footer className="vaultGalleryFooter"><span>{valuedEntries ? `Saved estimates: ${cad.format(totalValue(filtered))} CAD · ${valuedEntries} of ${filtered.length} entries valued` : "No estimates saved yet."}</span><Link href="/analytics">View insights <VaultIcon name="arrow" size={14} /></Link></footer> : null}
      </PageShell>
    </AuthGate>
  );
}
