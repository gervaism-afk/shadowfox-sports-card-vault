"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppHeader, { isVaultRouteActive } from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import VaultIcon from "@/components/VaultIcon";

const sidebarLinks = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/collection", label: "All cards", icon: "grid" },
  { href: "/binders", label: "Binders", icon: "binder" },
  { href: "/want-list", label: "Want list", icon: "heart" },
  { href: "/scan", label: "Scan a card", icon: "scan" },
  { href: "/analytics", label: "Insights", icon: "chart" },
];

export default function PageShell({ title, children }: { title?: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <div className={user ? "vaultAppShell" : "vaultGuestShell"}>
      <AppHeader />
      <div className="appLayout">
        {user ? <aside className="appSidebar" aria-label="Vault sidebar">
          <div className="sidebarEyebrow">Your vault</div>
          <nav aria-label="Vault navigation">
            {sidebarLinks.map((item) => <Link key={item.href} href={item.href} className={`sidebarNavLink${isVaultRouteActive(pathname, item.href) ? " sidebarNavLinkActive" : ""}`} aria-current={isVaultRouteActive(pathname, item.href) ? "page" : undefined}><VaultIcon name={item.icon} size={17} /><span>{item.label}</span></Link>)}
          </nav>
          <div className="sidebarNote"><VaultIcon name="shield" size={18} /><strong>A vault of your own.</strong><p>Your collection, ready whenever you are.</p></div>
        </aside> : null}
        <main className="appMain" id="main-content" tabIndex={-1}>
          <div className="container vaultContent">
            {title ? <h1 className="pageTitle">{title}</h1> : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
