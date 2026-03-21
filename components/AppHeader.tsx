"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AppHeader() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return setIsAdmin(false);

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(data?.role === "admin");
    }

    checkAdmin();
  }, [user]);

  return (
    <header className="appHeader">
      <div className="headerInner">

        {/* LEFT SIDE */}
        <div className="logo">
          <Link href="/">ShadowFox</Link>
        </div>

        {/* NAV */}
        <nav className="nav">
          <Link href="/scan">Scan</Link>
          <Link href="/manual">Add</Link>
          <Link href="/collection">Collection</Link>
          <Link href="/analytics">Analytics</Link>

          {/* ADMIN BUTTON (ONLY IF ADMIN) */}
          {isAdmin && (
            <Link href="/admin" className="adminBtn">
              Admin
            </Link>
          )}
        </nav>

      </div>
    </header>
  );
}
