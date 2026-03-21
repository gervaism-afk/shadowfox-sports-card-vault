"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import LoginPanel from "@/components/LoginPanel";

type HomeContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  loginHeading: string;
  loginText: string;
  feature1Icon: string;
  feature1Title: string;
  feature1Text: string;
  feature2Icon: string;
  feature2Title: string;
  feature2Text: string;
  feature3Icon: string;
  feature3Title: string;
  feature3Text: string;
};

const fallbackContent: HomeContent = {
  heroEyebrow: "ShadowFox Sports Cards",
  heroTitle: "Track Your Collection Like a Pro",
  heroSubtitle: "ShadowFox Sports Cards helps you scan, organize, and value your cards with a premium collector-first experience.",
  primaryLabel: "Start Scanning",
  primaryHref: "/scan",
  secondaryLabel: "View Collection",
  secondaryHref: "/collection",
  loginHeading: "Log in or create your ShadowFox vault",
  loginText: "Sign in to manage your collection, unlock analytics, and keep your card vault synced and protected.",
  feature1Icon: "📸",
  feature1Title: "Scan Cards",
  feature1Text: "Quickly capture card data and move cards into your vault faster.",
  feature2Icon: "📊",
  feature2Title: "Track Value",
  feature2Text: "Monitor collection totals, card counts, and portfolio insights.",
  feature3Icon: "🗂️",
  feature3Title: "Organize Easily",
  feature3Text: "Sort, filter, and manage your collection in one premium workspace.",
};

export default function HomePage() {
  const [content, setContent] = useState<HomeContent>(fallbackContent);

  useEffect(() => {
    let active = true;

    async function loadContent() {
      try {
        const res = await fetch("/api/content/homepage", { cache: "no-store" });
        const json = await res.json();
        if (active && json?.content) {
          setContent({ ...fallbackContent, ...json.content });
        }
      } catch (error) {
        console.error("Failed to load homepage content", error);
      }
    }

    loadContent();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell>
      <section className="sfHero">
        <div className="sfHeroContent">
          <div className="sfEyebrowMini">{content.heroEyebrow}</div>
          <h1 className="sfHeroTitle">{content.heroTitle}</h1>
          <p className="sfHeroSub">{content.heroSubtitle}</p>

          <div className="sfHeroButtons">
            <Link href={content.primaryHref || "/scan"} className="sfPrimaryBtn">
              {content.primaryLabel}
            </Link>
            <Link href={content.secondaryHref || "/collection"} className="sfGhostBtn">
              {content.secondaryLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="sfGrid3">
        <div className="sfFeatureCard">
          <div className="sfFeatureIcon">{content.feature1Icon}</div>
          <div className="sfFeatureTitle">{content.feature1Title}</div>
          <div className="sfFeatureText">{content.feature1Text}</div>
        </div>

        <div className="sfFeatureCard">
          <div className="sfFeatureIcon">{content.feature2Icon}</div>
          <div className="sfFeatureTitle">{content.feature2Title}</div>
          <div className="sfFeatureText">{content.feature2Text}</div>
        </div>

        <div className="sfFeatureCard">
          <div className="sfFeatureIcon">{content.feature3Icon}</div>
          <div className="sfFeatureTitle">{content.feature3Title}</div>
          <div className="sfFeatureText">{content.feature3Text}</div>
        </div>
      </section>

      <section className="sfAuthSection" id="auth">
        <div style={{ marginBottom: 18 }}>
          <div className="sfEyebrowMini">Collector Access</div>
          <h2 className="sfSectionTitle" style={{ marginBottom: 8 }}>{content.loginHeading}</h2>
          <p className="sfMuted" style={{ lineHeight: 1.7 }}>{content.loginText}</p>
        </div>

        <LoginPanel />
      </section>
    </PageShell>
  );
}
