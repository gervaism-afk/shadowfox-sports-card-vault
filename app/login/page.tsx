"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import LoginPanel from "@/components/LoginPanel";
import PageShell from "@/components/PageShell";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/collection");
  }, [loading, user, router]);

  return <PageShell>
    {loading || user ? <section className="panel" role="status">Opening your vault…</section> :
      <section className="vaultLoginCard" style={{ margin: "32px auto", maxWidth: 470 }}>
        <div className="vaultEyebrow">ShadowFox Card Vault</div>
        <h1 className="pageTitle">Your collection starts here.</h1>
        <p className="vaultWelcomeCopy">Log in to your vault, or create an account to start tracking your cards.</p>
        <LoginPanel />
      </section>}
  </PageShell>;
}
