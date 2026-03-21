"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getMyRole } from "@/lib/admin";
import { useEffect, useState } from "react";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className={active ? "navLink navLinkActive" : "navLink"}>
      {children}
    </Link>
  );
}

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"user" | "admin">("user");

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRole("user");
      return;
    }
    getMyRole()
      .then((nextRole) => {
        if (!cancelled) setRole(nextRole);
      })
      .catch(() => {
        if (!cancelled) setRole("user");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <header className="appHeader premiumHeader">
      <Link href="/" className="brandWrap brandWrapLink">
        <div className="brandLogo">
          <Image src="/logo.png" alt="ShadowFox" width={72} height={72} />
        </div>
        <div>
          <div className="brandTitle">ShadowFox Sports Card Vault</div>
          <div className="brandSub">Premium hockey & baseball collection management</div>
        </div>
      </Link>

      <div className="headerActions">
        {user ? (
          <nav className="navTabs">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/scan">Scan</NavLink>
            <NavLink href="/manual">Add Manually</NavLink>
            <NavLink href="/collection">Collection</NavLink>
            <NavLink href="/analytics">Analytics</NavLink>
            {role === "admin" ? <NavLink href="/admin">Admin</NavLink> : null}
            <button
              className="navLogout"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Log Out
            </button>
          </nav>
        ) : (
          <nav className="navTabs">
            <a href="#auth" className="navLink">Log In</a>
            <a href="#auth" className="navLink navLinkAccent">Create Account</a>
          </nav>
        )}
      </div>
    </header>
  );
}
