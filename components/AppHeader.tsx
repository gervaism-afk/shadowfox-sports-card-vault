"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AppHeader() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="sfHeaderBanner">
      <div className="sfHeaderOverlay">
        <Link href="/" className="sfBrandRow">
          <Image
            src="/logo.png"
            alt="ShadowFox Sports Cards"
            width={72}
            height={72}
            className="sfLogo"
            priority
          />
          <div className="sfBrandTextWrap">
            <div className="sfBrandTitle">ShadowFox Sports Cards</div>
            <div className="sfBrandSub">Premium Card Tracking System</div>
          </div>
        </Link>

        <nav className="sfNavRow">
          <Link href="/" className="sfTopBtn">Home</Link>
          <Link href="/scan" className="sfTopBtn">Scan</Link>
          <Link href="/manual" className="sfTopBtn">Add</Link>
          <Link href="/collection" className="sfTopBtn">Collection</Link>
          <Link href="/analytics" className="sfTopBtn">Analytics</Link>
          <Link href="/admin" className="sfTopBtn sfAdminBtn">Admin</Link>
          <button onClick={handleLogout} className="sfTopBtn sfLogoutBtn" type="button">
            Log Out
          </button>
        </nav>
      </div>
    </header>
  );
}
