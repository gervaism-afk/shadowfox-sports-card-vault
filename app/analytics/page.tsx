"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import { loadCards } from "@/lib/storage";
import { CardRecord } from "@/lib/types";
import { recordTotal, totalCards, totalValue, uniqueCards } from "@/lib/utils";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";

function sumBy<T extends string>(cards: CardRecord[], getter: (c: CardRecord) => T) {
  const map = new Map<T, number>();
  for (const c of cards) { const key = getter(c) || ("Unknown" as T); map.set(key, (map.get(key) || 0) + Number(c.quantity || 0)); }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}
function valueBy<T extends string>(cards: CardRecord[], getter: (c: CardRecord) => T) {
  const map = new Map<T, number>();
  for (const c of cards) { const key = getter(c) || ("Unknown" as T); map.set(key, (map.get(key) || 0) + recordTotal(c)); }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}
function BarList({ items, currency = false }: { items: [string, number][]; currency?: boolean }) {
  const max = Math.max(1, ...items.map((x) => x[1]));
  return <div className="barList">{items.map(([label, val]) => <div className="barRow" key={label}><div className="barMeta"><span>{label}</span><span>{currency ? `$${val.toFixed(2)} CAD` : val}</span></div><div className="barTrack" aria-hidden="true"><div className="barFill" style={{ width: `${Math.max(0, (val / max) * 100)}%` }} /></div></div>)}</div>;
}

type PageContent = typeof PAGE_CONTENT_DEFAULTS.analytics;

export default function AnalyticsPage() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState<PageContent>(PAGE_CONTENT_DEFAULTS.analytics);
  useEffect(() => { loadCards().then(setCards).catch((e) => setError(e.message || "Failed to load analytics")).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    fetch("/api/content/analytics", { cache: "no-store" })
      .then((r) => r.json()).then((json) => setContent({ ...PAGE_CONTENT_DEFAULTS.analytics, ...(json?.content || {}) })).catch(() => {});
  }, []);
  const total = useMemo(() => totalValue(cards), [cards]);
  const totalQty = useMemo(() => totalCards(cards), [cards]);
  const unique = useMemo(() => uniqueCards(cards), [cards]);
  const avgCard = useMemo(() => (totalQty ? total / totalQty : 0), [total, totalQty]);
  const gradedQty = useMemo(() => cards.filter((c) => !!c.gradingCompany).reduce((s, c) => s + (Number(c.quantity) || 0), 0), [cards]);
  const rookieQty = useMemo(() => cards.filter((c) => c.rookie).reduce((s, c) => s + (Number(c.quantity) || 0), 0), [cards]);
  const autoQty = useMemo(() => cards.filter((c) => c.autograph).reduce((s, c) => s + (Number(c.quantity) || 0), 0), [cards]);
  const relicQty = useMemo(() => cards.filter((c) => c.relicPatch).reduce((s, c) => s + (Number(c.quantity) || 0), 0), [cards]);
  const sportCounts = useMemo(() => sumBy(cards, (c) => c.sport).slice(0, 5), [cards]);
  const playerCounts = useMemo(() => sumBy(cards, (c) => c.player || "Unknown").slice(0, 10), [cards]);
  const brandValues = useMemo(() => valueBy(cards, (c) => c.brand || "Unknown").slice(0, 10), [cards]);
  const teamValues = useMemo(() => valueBy(cards, (c) => c.team || "Unknown").slice(0, 10), [cards]);
  const yearCounts = useMemo(() => sumBy(cards, (c) => c.year || "Unknown").slice(0, 12), [cards]);
  const topCards = useMemo(() => [...cards].sort((a, b) => recordTotal(b) - recordTotal(a)).slice(0, 8), [cards]);

  return <AuthGate><PageShell>
    <section className="workflowPageHeader"><div><div className="vaultEyebrow">A closer look at your collection</div><h1 className="workflowTitle">{content.title}</h1><p className="workflowIntro">{content.subtitle}</p></div><Link className="btn ghost" href="/collection">View Collection</Link><Link className="btn ghost" href="/transactions">Purchases &amp; sales</Link></section>
    {error ? <section className="workflowNotice" role="alert">{error}</section> : null}
    {loading ? <section className="panel" role="status">Putting your collection in perspective…</section> : !cards.length ? <section className="panel emptyState"><div className="emptyStateTitle">{content.emptyTitle}</div><p className="emptyStateText">{content.emptyText}</p><Link className="btn primary" href="/scan">Add your first card</Link></section> : <>
      <section className="analyticsSummary" aria-label="Collection totals">
        <div className="analyticsValue"><span className="kpiLabel">Estimated collection value</span><strong>${total.toFixed(2)} <small>CAD</small></strong><p className="helperText">Based on the estimates saved in your vault.</p></div>
        <div className="analyticsSummaryStats"><div className="kpiCard"><div className="kpiLabel">Total cards</div><div className="kpiValue">{totalQty}</div></div><div className="kpiCard"><div className="kpiLabel">Unique cards</div><div className="kpiValue">{unique}</div></div><div className="kpiCard"><div className="kpiLabel">Average card · CAD</div><div className="kpiValue">${avgCard.toFixed(2)}</div></div></div>
      </section>
      <section className="analyticsHighlights" aria-label="Card attributes"><div><strong>{gradedQty}</strong><span>Graded</span></div><div><strong>{rookieQty}</strong><span>Rookies</span></div><div><strong>{autoQty}</strong><span>Autographs</span></div><div><strong>{relicQty}</strong><span>Relic / Patch</span></div></section>
      <div className="analyticsBand"><section className="chartPanel"><h2>{content.sectionSport}</h2><BarList items={sportCounts} /></section><section className="chartPanel"><h2>{content.sectionPlayers}</h2><BarList items={playerCounts} /></section></div>
      <div className="analyticsBand"><section className="chartPanel"><h2>{content.sectionBrand}</h2><BarList items={brandValues} currency /></section><section className="chartPanel"><h2>{content.sectionTeam}</h2><BarList items={teamValues} currency /></section></div>
      <div className="analyticsBand"><section className="chartPanel"><h2>{content.sectionYear}</h2><BarList items={yearCounts} /></section><section className="chartPanel"><h2>{content.sectionTopCards}</h2><div className="analyticsCardList">{topCards.map((c) => <Link className="analyticsCardItem" href={`/card/${c.id}`} key={c.id}><div className="analyticsThumb">{c.frontImage ? <img src={c.frontImage} alt={`${c.player || "Card"} front`} /> : <span>No photo</span>}</div><div><strong>{c.player || "Untitled Card"}</strong><p className="helperText">{[c.year, c.brand, c.set, c.cardNumber ? `#${c.cardNumber}` : ""].filter(Boolean).join(" · ")}</p><p className="helperText">Qty {c.quantity} · ${Number(c.estimatedValueCad || 0).toFixed(2)} each</p></div><span className="analyticsCardValue">${recordTotal(c).toFixed(2)}<small>CAD total</small></span></Link>)}</div></section></div>
    </>}
  </PageShell></AuthGate>;
}
