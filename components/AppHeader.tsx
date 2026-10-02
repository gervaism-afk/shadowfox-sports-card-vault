"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import VaultIcon from "@/components/VaultIcon";
import { getMyRole } from "@/lib/admin";

const navigation = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/collection", label: "Collection", icon: "grid" },
  { href: "/scan", label: "Scan", icon: "scan" },
  { href: "/analytics", label: "Insights", icon: "chart" },
];

export function isVaultRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/collection") return pathname === "/collection" || pathname.startsWith("/card/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setAdminUserId(null);
    if (user) {
      getMyRole().then((role) => {
        if (!cancelled) setAdminUserId(role === "admin" ? user.id : null);
      }).catch(() => {
        if (!cancelled) setAdminUserId(null);
      });
    }
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => { setAccountOpen(false); }, [pathname, user?.id]);

  useEffect(() => {
    if (!accountOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setAccountOpen(false);
      setSigningOut(false);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <>
      <a className="skipLink" href="#main-content">Skip to content</a>
      <header className="compactHeader">
        <div className="compactHeaderInner">
          <Link href="/" className="brandWordmark" aria-label="ShadowFox home">
            <svg className="brandFoxMark" width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="m5 5 10.5 6L27 5l-3 15-8.5 7L7 20 5 5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="m5 5 11 15L27 5M7 20l9-5 8 5m-8 0v7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span>
              <span className="brandTitle">ShadowFox<span className="brandDot">.</span></span>
              <span className="brandSubtitle">Sports Card Vault</span>
            </span>
          </Link>
          {user ? <nav className="headerNav" aria-label="Main navigation">
            {navigation.slice(1).map((item) => <Link key={item.href} href={item.href} className={`navLink${isVaultRouteActive(pathname, item.href) ? " navLinkActive" : ""}`} aria-current={isVaultRouteActive(pathname, item.href) ? "page" : undefined}>{item.label}</Link>)}
          </nav> : null}
          <div className="headerActions">
            {user ? <>
              <Link href="/manual" className="btn primary headerAddButton"><VaultIcon name="plus" size={16} /> <span>Add a card</span></Link>
              <div className="accountMenu" ref={accountRef}>
                <button className="accountMenuTrigger" type="button" aria-label="Account menu" aria-expanded={accountOpen} aria-controls="account-dropdown" onClick={() => setAccountOpen((open) => !open)}>
                  <span aria-hidden="true">{(user.email?.charAt(0) || "C").toUpperCase()}</span>
                </button>
                {accountOpen ? <div className="accountDropdown" id="account-dropdown">
                  <div className="accountDropdownIdentity"><span className="eyebrow">Your account</span><span>{user.email || "Collector"}</span></div>
                  {adminUserId === user.id ? <Link href="/admin" onClick={() => setAccountOpen(false)}><VaultIcon name="shield" size={16} /> Admin</Link> : null}
                  <button type="button" onClick={handleLogout} disabled={signingOut}><VaultIcon name="logout" size={16} /> {signingOut ? "Signing out…" : "Log Out"}</button>
                </div> : null}
              </div>
            </> : !loading ? <>
              <Link href="/scan" className="navLink guestScanLink">Scan a card</Link>
              <Link href="/#sign-in" className="btn primary">Sign in</Link>
            </> : <span className="headerAuthLoading" aria-label="Checking sign-in" />}
          </div>
        </div>
      </header>
      {user ? <nav className="mobileNav" aria-label="Mobile navigation">
        {navigation.map((item) => <Link key={item.href} href={item.href} className={`mobileNavLink${isVaultRouteActive(pathname, item.href) ? " mobileNavLinkActive" : ""}`} aria-current={isVaultRouteActive(pathname, item.href) ? "page" : undefined}><VaultIcon name={item.icon} size={20} /><span>{item.label}</span></Link>)}
      </nav> : null}
    </>
  );
}
