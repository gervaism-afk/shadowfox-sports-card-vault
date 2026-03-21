import PageShell from "@/components/PageShell";
import LoginPanel from "@/components/LoginPanel";
import Link from "next/link";

export default function HomePage() {
  return (
    <PageShell>

      {/* HERO */}
      <section className="sfHero">
        <div className="sfHeroContent">
          <h1 className="sfHeroTitle">
            Track Your Collection Like a Pro
          </h1>

          <p className="sfHeroSub">
            ShadowFox Sports Cards helps you scan, organize, and value your cards with precision.
          </p>

          <div className="sfHeroButtons">
            <Link href="/scan" className="sfPrimaryBtn">
              Start Scanning
            </Link>
            <Link href="/collection" className="sfGhostBtn">
              View Collection
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="sfGrid3">
        <div className="sfFeatureCard">
          <div className="sfFeatureIcon">📸</div>
          <div className="sfFeatureTitle">Scan Cards</div>
          <div className="sfFeatureText">
            Quickly capture card data using camera or OCR tools.
          </div>
        </div>

        <div className="sfFeatureCard">
          <div className="sfFeatureIcon">📊</div>
          <div className="sfFeatureTitle">Track Value</div>
          <div className="sfFeatureText">
            Monitor total collection value and card performance.
          </div>
        </div>

        <div className="sfFeatureCard">
          <div className="sfFeatureIcon">🗂️</div>
          <div className="sfFeatureTitle">Organize Easily</div>
          <div className="sfFeatureText">
            Filter, sort, and manage your entire vault effortlessly.
          </div>
        </div>
      </section>

      {/* LOGIN */}
      <section id="auth" className="sfAuthSection">
        <LoginPanel />
      </section>

    </PageShell>
  );
}
