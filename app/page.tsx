
"use client";

import Link from "next/link";
import PageShell from "@/components/PageShell";
import LoginPanel from "@/components/LoginPanel";
import { useEffect, useMemo, useState } from "react";
import { loadCards } from "@/lib/storage";
import { totalCards, totalValue, uniqueCards } from "@/lib/utils";
import { CardRecord } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";

type HomeContent = typeof PAGE_CONTENT_DEFAULTS.homepage;

export default function HomePage() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [error, setError] = useState("");
  const [content, setContent] = useState<HomeContent>(PAGE_CONTENT_DEFAULTS.homepage);

  useEffect(() => {
    fetch("/api/content/homepage", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setContent({ ...PAGE_CONTENT_DEFAULTS.homepage, ...(json?.content || {}) }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    loadCards().then(setCards).catch((e) => setError(e.message || "Failed to load cards"));
  }, [user]);

  const hockeyCount = useMemo(() => cards.filter((c) => c.sport === "Hockey").reduce((s, c) => s + (Number(c.quantity) || 0), 0), [cards]);
  const baseballCount = useMemo(() => cards.filter((c) => c.sport === "Baseball").reduce((s, c) => s + (Number(c.quantity) || 0), 0), [cards]);

  if (loading) return <PageShell><section className="panel">Loading…</section></PageShell>;

  if (!user) {
    return (
      <PageShell>
        <div className="premiumHeroPage">
          <section className="premiumBgShell landingSplit">
            <div className="landingLeft">
              <div className="premiumTopBadge">⚡ Premium Cloud Vault • Desktop + Mobile</div>

              <div className="landingBrandRow">
                <div className="premiumBrandMark">
                  <img src="/logo.png" alt="ShadowFox" />
                </div>

                <div>
                  <div className="sfEyebrowMini" style={{ marginBottom: 12 }}>{content.heroEyebrow}</div>
                  <h1 className="premiumTitle landingTitle">{content.heroTitle}</h1>
                  <div className="premiumSubtitle landingSubtitle">{content.heroSubtitle}</div>
                </div>
              </div>

              <div className="sfHeroButtons" style={{ marginBottom: 18 }}>
                <Link href={content.primaryHref} className="sfPrimaryBtn">{content.primaryLabel}</Link>
                <Link href={content.secondaryHref} className="sfGhostBtn">{content.secondaryLabel}</Link>
              </div>

              <div className="featurePills landingPills">
                <div className="featurePill">Secure Login</div>
                <div className="featurePill">Cloud Sync</div>
                <div className="featurePill">Hockey + Baseball</div>
                <div className="featurePill">Portfolio Analytics</div>
              </div>

              <div className="featurePreviewCard landingPreview">
                <h3 className="featurePreviewTitle">What you can do</h3>
                <div className="featurePreviewGrid">
                  <div className="featurePreviewItem">
                    <strong><span className="featurePreviewCheck">✓</span>{content.feature1Title}</strong>
                    <span>{content.feature1Text}</span>
                  </div>
                  <div className="featurePreviewItem">
                    <strong><span className="featurePreviewCheck">✓</span>{content.feature2Title}</strong>
                    <span>{content.feature2Text}</span>
                  </div>
                  <div className="featurePreviewItem">
                    <strong><span className="featurePreviewCheck">✓</span>{content.feature3Title}</strong>
                    <span>{content.feature3Text}</span>
                  </div>
                  <div className="featurePreviewItem">
                    <strong><span className="featurePreviewCheck">✓</span>Access anywhere</strong>
                    <span>Use the same private collection on desktop, phone, or tablet.</span>
                  </div>
                </div>
              </div>

              <div className="premiumFooterNote">
                Built for serious Hockey &amp; Baseball collectors.
              </div>
            </div>

            <div className="landingRight" id="auth">
              <div style={{ marginBottom: 18 }}>
                <h2 className="sfSectionTitle" style={{ marginBottom: 8 }}>{content.loginHeading}</h2>
                <p className="sfMuted" style={{ lineHeight: 1.7 }}>{content.loginText}</p>
              </div>
              <LoginPanel />
            </div>
          </section>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {error ? <section className="panel" style={{ marginBottom: 16 }}>{error}</section> : null}

      <section className="heroGrid">
        <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Total Cards</div><div className="kpiValue">{totalCards(cards)}</div></div>
        <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Unique Cards</div><div className="kpiValue">{uniqueCards(cards)}</div></div>
        <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Estimated Collection Value</div><div className="kpiValue">${totalValue(cards).toFixed(2)} CAD</div></div>
      </section>

      <section className="heroGrid" style={{ marginBottom: 18 }}>
        <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Hockey Cards</div><div className="kpiValue">{hockeyCount}</div></div>
        <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Baseball Cards</div><div className="kpiValue">{baseballCount}</div></div>
        <div className="kpiCard hoverLift fadeInUp"><div className="kpiLabel">Vault Status</div><div className="kpiValue">Private</div></div>
      </section>

      <section className="actionGrid">
        <Link className="actionCard" href="/scan"><strong>{content.feature1Title}</strong><span>{content.feature1Text}</span></Link>
        <Link className="actionCard" href="/collection"><strong>{content.feature2Title}</strong><span>{content.feature2Text}</span></Link>
        <Link className="actionCard" href="/collection"><strong>{content.feature3Title}</strong><span>{content.feature3Text}</span></Link>
        <Link className="actionCard" href="/analytics"><strong>Portfolio Dashboard</strong><span>Track value, top cards, sport mix, and collection breakdowns.</span></Link>
      </section>
    </PageShell>
  );
}
