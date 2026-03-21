"use client";

import Link from "next/link";
import Image from "next/image";

export default function AppHeader() {
  return (
    <header className="sfHeader">
      <div className="sfHeaderInner">

        {/* LOGO + BRAND */}
        <Link href="/" className="sfBrand">
          <Image
            src="/logo.png"
            alt="ShadowFox Sports Cards"
            width={42}
            height={42}
            className="sfLogo"
          />
          <span className="sfBrandText">ShadowFox Sports Cards</span>
        </Link>

        {/* NAV */}
        <nav className="sfNav">
          <Link href="/scan" className="sfNavLink">Scan</Link>
          <Link href="/manual" className="sfNavLink">Add</Link>
          <Link href="/collection" className="sfNavLink">Collection</Link>
          <Link href="/analytics" className="sfNavLink">Analytics</Link>
          <Link href="/admin" className="sfNavLink sfAdminBtn">Admin</Link>
        </nav>

      </div>
    </header>
  );
}
