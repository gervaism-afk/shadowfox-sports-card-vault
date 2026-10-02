import type { Metadata } from "next";
import Image from "next/image";
import VaultIcon from "@/components/VaultIcon";
import "./storefront.css";

const vaultUrl = "https://shadowfox-sports-card-vault.vercel.app/login";
const ebayStoreUrl = "https://www.ebay.ca/usr/shadowfoxsportscards";

export const metadata: Metadata = {
  title: "ShadowFox Cards | Hockey & Baseball Cards",
  description: "Find your next hockey or baseball card in the ShadowFox Cards eBay shop, or open the ShadowFox Card Vault to track your collection.",
  alternates: { canonical: "https://www.shadowfoxcards.ca/" },
  openGraph: { title: "ShadowFox Cards", description: "Shop our hockey and baseball cards on eBay, or open the ShadowFox Card Vault.", url: "https://www.shadowfoxcards.ca/", siteName: "ShadowFox Cards", type: "website" },
};

export default function ShopLandingPage() {
  return <div className="storefront">
    <a className="skipLink" href="#shop-main">Skip to content</a>
    <header className="storeHeader">
      <a className="storeBrand" href="#" aria-label="ShadowFox Cards home"><Image src="/logo.png" width={54} height={54} alt="" priority /><span>ShadowFox<span className="storeGold"> Cards</span></span></a>
      <a className="storeAppLink" href={vaultUrl}>Card Vault <VaultIcon name="arrow" size={16} /></a>
    </header>
    <main id="shop-main" className="storeMain" tabIndex={-1}>
      <section className="storeHero">
        <div className="storeHeroCopy">
          <p className="storeEyebrow">Hockey &amp; baseball cards</p>
          <h1>Find your next<br /><em>favorite card.</em></h1>
          <p className="storeLead">Welcome to ShadowFox Cards. Browse our available cards on eBay, or organize your own collection with the ShadowFox Card Vault.</p>
          <div className="storeActions">
            <a className="btn primary" href={ebayStoreUrl} target="_blank" rel="noopener noreferrer">Shop on eBay <VaultIcon name="arrow" size={18} /></a>
            <a className="btn ghost" href={vaultUrl}><VaultIcon name="binder" size={18} />Open Card Vault</a>
          </div>
          <p className="storePurchaseNote">All purchases and checkout take place on eBay.</p>
        </div>
        <div className="storeBrandDisplay" aria-hidden="true"><div className="storeBrandRing"><Image src="/logo.png" width={400} height={400} priority alt="" sizes="(max-width: 700px) 240px, 400px" /></div><span>ShadowFox Cards</span></div>
      </section>
      <section className="storeFeatures" aria-label="Shop and collect">
        <div><span className="storeFeatureNumber">01</span><h2>Hockey cards</h2><p>Explore our hockey card listings on eBay.</p></div>
        <div><span className="storeFeatureNumber">02</span><h2>Baseball cards</h2><p>Browse our baseball card listings on eBay.</p></div>
        <div><span className="storeFeatureNumber">03</span><h2>Your personal vault</h2><p>Scan, organize and track your cards with the ShadowFox Card Vault.</p></div>
      </section>
    </main>
    <footer className="storeFooter"><span>© {new Date().getFullYear()} ShadowFox Cards</span><span>Collect what you love.</span></footer>
  </div>;
}
