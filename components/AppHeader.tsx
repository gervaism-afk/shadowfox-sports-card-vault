"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getMyRole } from "@/lib/admin";
import { useEffect, useState } from "react";

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
    getMyRole().then((nextRole) => {
      if (!cancelled) setRole(nextRole);
    }).catch(() => {
      if (!cancelled) setRole("user");
    });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <header className="appHeader">
      <div className="brandWrap">
        <div className="brandLogo">
          <Image src="/logo.png" alt="ShadowFox" width={72} height={72} />
        </div>
        <div>
          <div className="brandTitle">ShadowFox Sports Card Collection Vault</div>
          <div className="brandSub">Hockey & Baseball Card Management</div>
        </div>
      </div>

      {user ? (
        <nav className="navTabs">
          <Link href="/">Home</Link>
          <Link href="/scan">Scan</Link>
          <Link href="/manual">Add Manually</Link>
          <Link href="/collection">Collection</Link>
          <Link href="/analytics">Analytics</Link>
          {role === "admin" ? <Link href="/admin">Admin</Link> : null}
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
      ) : null}
    </header>
  );
}
