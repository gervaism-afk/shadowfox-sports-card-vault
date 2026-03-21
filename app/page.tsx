"use client";

import Link from "next/link";
import PageShell from "@/components/PageShell";
import LoginPanel from "@/components/LoginPanel";
import { useEffect, useMemo, useState } from "react";
import { loadCards } from "@/lib/storage";
import { totalCards, totalValue, uniqueCards } from "@/lib/utils";
import { CardRecord } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

const guestFeatures = [
  {
    title: "Fast Card Scanning",
    text: "Scan and capture your cards quickly with a clean workflow built for collectors.",
  },
  {
    title: "Manual Add Mode",
    text: "Add cards by hand with full control over details, notes, and condition data.",
  },
  {
    title: "Vault Collection",
    text: "Browse, filter, and manage your collection in a polished collector-first layout.",
  },
  {
    title: "Portfolio Analytics",
    text: "Track value, count, and portfolio insights across your ShadowFox vault.",
  },
];

const trustPoints = [
  "Built for serious sports card collectors",
  "Fast collection tracking and management",
  "Premium ShadowFox brand experience",
  "Admin-ready platform for growth",
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [error, setError] = useState("");

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
        <section className="sfHero">
          <div className="sfHeroGlow sfHeroGlowOne" />
          <div className="sfHeroGlow sfHeroGlowTwo" />

          <div className="sfHeroInner sfHeroInnerAuth">
            <div className="sfHeroCopy">
              <div className="sfEyebrow">ShadowFox Sports Cards</div>
              <h1 className="sfHeadline">A premium vault for serious collectors.</h1>
              <p className="sfSubhead">
                CardTrack helps you scan, organize, manage, and analyze your sports card collection
                with a polished ShadowFox experience built for the hobby.
              </p>

              <div className="sfHeroActions">
                <Link href="#auth" className="sfPrimaryBtn">Log In to Start</Link>
                <Link href="#auth" className="sfSecondaryBtn">Create Account</Link>
              </div>

              <div className="sfTrustGrid">
                {trustPoints.map((point) => (
                  <div className="sfTrustItem" key={point}>
                    <span className="sfTrustDot" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sfHeroPanel" id="auth">
              <div className="sfHeroPanelBadge">Collector Access</div>
              <LoginPanel />
            </div>
          </div>
        </section>

        <section className="sfSection">
          <div className="sfSectionHeader">
            <div className="sfEyebrow">Core Tools</div>
            <h2 className="sfSectionTitle">Everything you need to run your collection like a vault.</h2>
            <p className="sfSectionText">
              Designed around the real workflow of collectors — add cards fast, keep everything organized,
              and understand the value of your collection at a glance.
            </p>
          </div>

          <div className="sfFeatureGrid">
            {guestFeatures.map((card) => (
              <a key={card.title} href="#auth" className="sfFeatureCard sfFeatureLinkWrap">
                <div className="sfFeatureTopLine" />
                <h3 className="sfFeatureTitle">{card.title}</h3>
                <p className="sfFeatureText">{card.text}</p>
                <span className="sfFeatureLink">Unlock with Account</span>
              </a>
            ))}
          </div>
        </section>
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
        <Link className="actionCard" href="/scan"><strong>Scan</strong><span>Upload or use camera to start adding cards.</span></Link>
        <Link className="actionCard" href="/manual"><strong>Add Manually</strong><span>Create cards with or without images and set quantity/value.</span></Link>
        <Link className="actionCard" href="/collection"><strong>Collection</strong><span>Search, filter, sort, export, and review your full vault.</span></Link>
        <Link className="actionCard" href="/analytics"><strong>Portfolio Dashboard</strong><span>Track value, top cards, sport mix, and collection breakdowns.</span></Link>
      </section>
    </PageShell>
  );
}
