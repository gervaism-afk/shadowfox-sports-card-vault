
"use client";
import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import { loadCards } from "@/lib/storage";
import { CardRecord } from "@/lib/types";
import { recordTotal, totalCards, totalValue, uniqueCards } from "@/lib/utils";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";

function sumBy<T extends string>(cards: CardRecord[], getter: (c: CardRecord) => T) { const map = new Map<T, number>(); for (const c of cards) { const key = getter(c) || ("Unknown" as T); map.set(key, (map.get(key) || 0) + Number(c.quantity || 0)); } return Array.from(map.entries()).sort((a, b) => b[1] - a[1]); }
function valueBy<T extends string>(cards: CardRecord[], getter: (c: CardRecord) => T) { const map = new Map<T, number>(); for (const c of cards) { const key = getter(c) || ("Unknown" as T); map.set(key, (map.get(key) || 0) + recordTotal(c)); } return Array.from(map.entries()).sort((a, b) => b[1] - a[1]); }
function BarList({ items, currency = false }: { items: [string, number][], currency?: boolean }) { const max = Math.max(1, ...items.map((x) => x[1])); return <div className="barList">{items.map(([label, val]) => <div className="barRow" key={label}><div className="barMeta"><span>{label}</span><span>{currency ? `$${val.toFixed(2)}` : val}</span></div><div className="barTrack"><div className="barFill" style={{ width: `${Math.max(6, (val / max) * 100)}%` }} /></div></div>)}</div>; }

type PageContent = typeof PAGE_CONTENT_DEFAULTS.analytics;

export default function AnalyticsPage() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [error, setError] = useState("");
  const [content, setContent] = useState<PageContent>(PAGE_CONTENT_DEFAULTS.analytics);
  useEffect(() => { loadCards().then(setCards).catch((e) => setError(e.message || "Failed to load analytics")); }, []);
  useEffect(() => {
    fetch("/api/content/analytics", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setContent({ ...PAGE_CONTENT_DEFAULTS.analytics, ...(json?.content || {}) }))
      .catch(() => {});
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
  return (
    <AuthGate>
      <PageShell title={content.title}>
        {error ? <section className="panel" style={{ marginBottom: 16 }}>{error}</section> : null}
        <section className="sfHeroMini" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="sfPageHeading">{content.title}</h1>
            <p className="sfPageIntro">{content.subtitle}</p>
          </div>
        </section>
        {!cards.length ? <section className="softPanel emptyState fadeInUp" style={{ marginBottom: 18 }}><div className="emptyStateIcon softPulse">📈</div><div className="emptyStateTitle">{content.emptyTitle}</div><div className="emptyStateText">{content.emptyText}</div></section> : null}
        <section className="heroGrid"><div className="kpiCard"><div className="kpiLabel">Estimated Portfolio Value</div><div className="kpiValue">${total.toFixed(2)}</div></div><div className="kpiCard"><div className="kpiLabel">Total Cards</div><div className="kpiValue">{totalQty}</div></div><div className="kpiCard"><div className="kpiLabel">Unique Cards</div><div className="kpiValue">{unique}</div></div></section>
        <section className="pillRow" style={{ margin: "18px 0" }}><div className="teamBadge">Graded: {gradedQty}</div><div className="teamBadge">Rookies: {rookieQty}</div><div className="teamBadge">Autographs: {autoQty}</div><div className="teamBadge">Relic/Patch: {relicQty}</div><div className="teamBadge">Avg Card: ${avgCard.toFixed(2)}</div></section>
        <div className="analyticsBand"><section className="chartPanel"><h3 className="featurePreviewTitle">{content.sectionSport}</h3><BarList items={sportCounts} /></section><section className="chartPanel"><h3 className="featurePreviewTitle">{content.sectionPlayers}</h3><BarList items={playerCounts} /></section></div>
        <div className="analyticsBand" style={{ marginTop: 18 }}><section className="chartPanel"><h3 className="featurePreviewTitle">{content.sectionBrand}</h3><BarList items={brandValues} currency /></section><section className="chartPanel"><h3 className="featurePreviewTitle">{content.sectionTeam}</h3><BarList items={teamValues} currency /></section></div>
        <div className="analyticsBand" style={{ marginTop: 18 }}><section className="chartPanel"><h3 className="featurePreviewTitle">{content.sectionYear}</h3><div className="sparkWrap">{yearCounts.map(([label, val]) => { const max = Math.max(1, ...yearCounts.map((x) => x[1])); return <div key={label} style={{ display: "grid", alignItems: "end" }}><div className="sparkBar" style={{ height: `${Math.max(10, (val / max) * 100)}%` }} title={`${label}: ${val}`} /></div>; })}</div><div className="helperText" style={{ marginTop: 8 }}>Hover bars for year totals</div></section><section className="chartPanel"><h3 className="featurePreviewTitle">{content.sectionTopCards}</h3><div className="topCardList">{topCards.map((c) => <div className="topCardItem" key={c.id}><div className="topCardThumb cardFrame">{c.frontImage ? <img src={c.frontImage} alt={c.player || "Card"} /> : <span>No image</span>}</div><div><strong>{c.player || "Untitled Card"}</strong><div className="helperText">{c.year} {c.brand} {c.set} #{c.cardNumber}</div><div className="helperText">Qty {c.quantity} • Each ${Number(c.estimatedValueCad || 0).toFixed(2)}</div></div><strong>${recordTotal(c).toFixed(2)}</strong></div>)}</div></section></div>
      </PageShell>
    </AuthGate>
  );
}
