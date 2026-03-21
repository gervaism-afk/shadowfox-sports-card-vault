"use client";

import Link from "next/link";
import Image from "next/image";

export default function AppHeader() {
  return (
    <header className="sfHeaderBanner">
      <div className="sfHeaderOverlay">

        {/* LEFT SIDE (LOGO + NAME) */}
        <Link href="/" className="sfBrandRow">
          <Image
            src="/logo.png"
            alt="ShadowFox Sports Cards"
            width={48}
            height={48}
            className="sfLogo"
          />
          <div className="sfBrandTextWrap">
            <div className="sfBrandTitle">ShadowFox Sports Cards</div>
            <div className="sfBrandSub">Premium Card Tracking System</div>
          </div>
        </Link>

        {/* NAV BUTTONS */}
        <nav className="sfNavRow">
          <Link href="/scan" className="sfTopBtn">Scan</Link>
          <Link href="/manual" className="sfTopBtn">Add</Link>
          <Link href="/collection" className="sfTopBtn">Collection</Link>
          <Link href="/analytics" className="sfTopBtn">Analytics</Link>
          <Link href="/admin" className="sfTopBtn sfAdminBtn">Admin</Link>
        </nav>

      </div>
    </header>
  );
}
