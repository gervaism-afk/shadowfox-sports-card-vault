import type { Metadata } from "next";
import Image from "next/image";
import VaultIcon from "@/components/VaultIcon";
import "./storefront.css";
import { readPageContent } from "@/lib/content/server";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";
export const dynamic = "force-dynamic";

const vaultUrl = "https://shadowfox-sports-card-vault.vercel.app/login";

export const metadata: Metadata = {
  title: "ShadowFox Cards | Hockey & Baseball Cards",
  description:
    "Find your next hockey or baseball card in the ShadowFox Cards eBay shop, or open the ShadowFox Card Vault to track your collection.",
  alternates: { canonical: "https://www.shadowfoxcards.ca/" },
  openGraph: {
    title: "ShadowFox Cards",
    description:
      "Shop our hockey and baseball cards on eBay, or open the ShadowFox Card Vault.",
    url: "https://www.shadowfoxcards.ca/",
    siteName: "ShadowFox Cards",
    type: "website",
  },
};

export default async function ShopLandingPage() {
  const content = await readPageContent("shop").catch(
    () => PAGE_CONTENT_DEFAULTS.shop,
  );
  return (
    <div className="storefront">
      <a className="skipLink" href="#shop-main">
        Skip to content
      </a>
      <header className="storeHeader">
        <a className="storeBrand" href="#" aria-label="ShadowFox Cards home">
          <Image
            src="/shadowfox-logo.png"
            width={54}
            height={54}
            alt=""
            priority
          />
          <span>
            ShadowFox<span className="storeGold"> Cards</span>
          </span>
        </a>
        <a className="storeAppLink" href={vaultUrl}>
          Card Vault <VaultIcon name="arrow" size={16} />
        </a>
      </header>
      <main id="shop-main" className="storeMain" tabIndex={-1}>
        <section className="storeHero">
          <div className="storeHeroCopy">
            <p className="storeEyebrow">{content.heroEyebrow}</p>
            <h1>
              {content.heroTitle === PAGE_CONTENT_DEFAULTS.shop.heroTitle ? (
                <>
                  Find your next
                  <br />
                  <em>favorite card.</em>
                </>
              ) : (
                content.heroTitle
              )}
            </h1>
            <p className="storeLead">{content.heroSubtitle}</p>
            <div className="storeActions">
              <a
                className="btn primary"
                href={content.ebayUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content.shopLabel} <VaultIcon name="arrow" size={18} />
              </a>
              <a className="btn ghost" href={vaultUrl}>
                <VaultIcon name="binder" size={18} />
                {content.vaultLabel}
              </a>
            </div>
            <p className="storePurchaseNote">{content.purchaseNote}</p>
          </div>
          <div className="storeBrandDisplay" aria-hidden="true">
            <div className="storeBrandRing">
              <Image
                src="/shadowfox-logo.png"
                width={400}
                height={400}
                priority
                alt=""
                sizes="(max-width: 700px) 240px, 400px"
              />
            </div>
            <span>ShadowFox Cards</span>
          </div>
        </section>
        <section className="storeFeatures" aria-label="Shop and collect">
          <div>
            <span className="storeFeatureNumber">01</span>
            <h2>{content.hockeyTitle}</h2>
            <p>{content.hockeyText}</p>
          </div>
          <div>
            <span className="storeFeatureNumber">02</span>
            <h2>{content.baseballTitle}</h2>
            <p>{content.baseballText}</p>
          </div>
          <div>
            <span className="storeFeatureNumber">03</span>
            <h2>{content.vaultTitle}</h2>
            <p>{content.vaultText}</p>
          </div>
        </section>
      </main>
      <footer className="storeFooter">
        <span>© {new Date().getFullYear()} ShadowFox Cards</span>
        <span>{content.footerText}</span>
      </footer>
    </div>
  );
}
