"use client";

import Link from "next/link";
import PageShell from "@/components/PageShell";
import LoginPanel from "@/components/LoginPanel";
import CollectionGrid from "@/components/CollectionGrid";
import VaultIcon from "@/components/VaultIcon";
import { useEffect, useMemo, useState } from "react";
import { loadCards } from "@/lib/storage";
import { sortCards, totalCards, totalValue, uniqueCards } from "@/lib/utils";
import { CardRecord } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";

type HomeContent = typeof PAGE_CONTENT_DEFAULTS.homepage;
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default function HomePage() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [error, setError] = useState("");
  const [cardsLoading, setCardsLoading] = useState(true);
  const [content, setContent] = useState<HomeContent>(PAGE_CONTENT_DEFAULTS.homepage);

  useEffect(() => {
    fetch("/api/content/homepage", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setContent({ ...PAGE_CONTENT_DEFAULTS.homepage, ...(json?.content || {}) }))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    setCards([]);
    setError("");
    setCardsLoading(true);
    if (user) {
      loadCards().then((next) => { if (active) setCards(next); })
        .catch((e) => { if (active) setError(e.message || "Failed to load cards"); })
        .finally(() => { if (active) setCardsLoading(false); });
    }
    return () => { active = false; };
  }, [user?.id]);

  const recentCards = useMemo(() => sortCards(cards, "newest").slice(0, 6), [cards]);
  const valuedEntries = cards.filter((card) => Number(card.estimatedValueCad) > 0).length;

  if (loading) return <PageShell><section className="panel" role="status">Opening your vault…</section></PageShell>;

  if (!user) {
    return (
      <PageShell>
        <section className="vaultLanding">
          <div className="vaultLandingCopy">
            <div className="vaultEyebrow">{content.heroEyebrow}</div>
            <h1 className="vaultDisplayTitle">{content.heroTitle}</h1>
            <p className="vaultWelcomeCopy">{content.heroSubtitle}</p>
            <div className="buttonRow"><Link href={content.primaryHref} className="btn primary"><VaultIcon name="scan" size={18} />{content.primaryLabel}</Link><Link href={content.secondaryHref} className="btn secondary">{content.secondaryLabel}</Link></div>
            <div className="vaultFeatureList">
              <div><VaultIcon name="scan" size={20} /><div><strong>{content.feature1Title}</strong><p>{content.feature1Text}</p></div></div>
              <div><VaultIcon name="chart" size={20} /><div><strong>{content.feature2Title}</strong><p>{content.feature2Text}</p></div></div>
              <div><VaultIcon name="binder" size={20} /><div><strong>{content.feature3Title}</strong><p>{content.feature3Text}</p></div></div>
            </div>
          </div>
          <div className="vaultLoginCard" id="sign-in"><div className="vaultEyebrow">Your personal vault</div><h2>{content.loginHeading}</h2><p className="vaultWelcomeCopy">{content.loginText}</p><LoginPanel /></div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="vaultWelcome">
        <div><div className="vaultEyebrow">A place for everything you collect</div><h1 className="vaultDisplayTitle">Your cards.<br /><em>Your story.</em></h1><p className="vaultWelcomeCopy">{content.heroSubtitle}</p></div>
        {!cardsLoading && !error ? <div className="vaultWelcomeStats" aria-label="Vault totals"><div className="vaultStat"><strong className="kpiValue">{totalCards(cards)}</strong><span>Total cards</span></div><div className="vaultStat"><strong>{uniqueCards(cards)}</strong><span>Unique cards</span></div></div> : null}
      </section>
      {error ? <section className="panel" role="alert">{error}</section> : null}
      <div className="vaultDashboardActions">
        <Link className="vaultActionLink" href="/scan"><VaultIcon name="scan" size={22} /><div><strong>{content.feature1Title}</strong><span>{content.feature1Text}</span></div><VaultIcon name="arrow" size={18} /></Link>
        <Link className="vaultActionLink" href="/analytics"><VaultIcon name="chart" size={22} /><div><strong>{content.feature2Title}</strong><span>{valuedEntries ? `${cad.format(totalValue(cards))} CAD in saved estimates · ${valuedEntries} of ${cards.length} entries valued` : "No estimates yet. Add confirmed prices to track your vault."}</span></div><VaultIcon name="arrow" size={18} /></Link>
      </div>
      <div className="vaultSectionHeading"><div><h2>Recently added</h2><p className="vaultResultsLabel">Your latest additions, all in one place.</p></div><Link className="vaultTextLink" href="/collection">View all <VaultIcon name="arrow" size={16} /></Link></div>
      {!error && (cardsLoading ? <section className="panel" role="status">Loading your cards…</section> : recentCards.length ? <CollectionGrid cards={recentCards} /> : <section className="vaultEmptyState"><VaultIcon name="binder" size={34} /><h2>Your collection starts here.</h2><p>Scan a card or enter the details yourself. Every card has a place.</p><div className="buttonRow"><Link className="btn primary" href="/scan"><VaultIcon name="scan" size={18} />Scan a card</Link><Link className="btn secondary" href="/manual">Add manually</Link></div></section>)}
      <footer className="vaultGalleryFooter"><span>{content.feature3Text}</span><Link href="/collection">{content.feature3Title} <VaultIcon name="arrow" size={14} /></Link></footer>
    </PageShell>
  );
}
