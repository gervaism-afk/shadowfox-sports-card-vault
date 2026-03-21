"use client";

import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sfHeader">
      <div className="sfHeaderInner">
        <Link href="/" className="sfBrand">
          <span className="sfBrandMark">SF</span>
          <span>ShadowFox Sports Cards</span>
        </Link>

        <nav className="sfNav">
          <Link href="/scan" className="sfNavLink">Scan</Link>
          <Link href="/manual" className="sfNavLink">Add</Link>
          <Link href="/collection" className="sfNavLink">Collection</Link>
          <Link href="/analytics" className="sfNavLink">Analytics</Link>
          <Link href="/admin" className="sfNavLink">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
