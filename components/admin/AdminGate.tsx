"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/components/AuthProvider";
import { getMyRole } from "@/lib/admin";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checkingRole, setCheckingRole] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setAllowed(false);
    setError("");
    setCheckingRole(true);
    if (loading) return;
    if (!user) {
      setCheckingRole(false);
      return;
    }

    async function run() {
      try {
        const role = await getMyRole();
        if (cancelled) return;
        if (role !== "admin") {
          router.replace("/");
          return;
        }
        setAllowed(true);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to verify admin access.");
      } finally {
        if (!cancelled) setCheckingRole(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, user?.id, loading]);

  return (
    <AuthGate>
      {checkingRole ? (
        <section className="panel">Checking admin access…</section>
      ) : error ? (
        <section className="panel">{error}</section>
      ) : allowed ? (
        <>{children}</>
      ) : (
        <section className="panel">Redirecting…</section>
      )}
    </AuthGate>
  );
}
