"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type HomeContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  loginHeading: string;
  loginText: string;
  feature1Icon: string;
  feature1Title: string;
  feature1Text: string;
  feature2Icon: string;
  feature2Title: string;
  feature2Text: string;
  feature3Icon: string;
  feature3Title: string;
  feature3Text: string;
};

const fallbackContent: HomeContent = {
  heroEyebrow: "ShadowFox Sports Cards",
  heroTitle: "Track Your Collection Like a Pro",
  heroSubtitle: "ShadowFox Sports Cards helps you scan, organize, and value your cards with a premium collector-first experience.",
  primaryLabel: "Start Scanning",
  primaryHref: "/scan",
  secondaryLabel: "View Collection",
  secondaryHref: "/collection",
  loginHeading: "Log in or create your ShadowFox vault",
  loginText: "Sign in to manage your collection, unlock analytics, and keep your card vault synced and protected.",
  feature1Icon: "📸",
  feature1Title: "Scan Cards",
  feature1Text: "Quickly capture card data and move cards into your vault faster.",
  feature2Icon: "📊",
  feature2Title: "Track Value",
  feature2Text: "Monitor collection totals, card counts, and portfolio insights.",
  feature3Icon: "🗂️",
  feature3Title: "Organize Easily",
  feature3Text: "Sort, filter, and manage your collection in one premium workspace.",
};

const supabase = createBrowserSupabaseClient();

export default function AdminContentPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [content, setContent] = useState<HomeContent>(fallbackContent);

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function verifyAdmin() {
    const currentToken = await getAccessToken();

    if (!currentToken) {
      router.push("/");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      router.push("/");
      return;
    }

    setToken(currentToken);
    setReady(true);
  }

  async function apiFetch(url: string, options: RequestInit = {}) {
    const currentToken = token ?? (await getAccessToken());
    if (!currentToken) throw new Error("Missing access token");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${currentToken}`);

    return fetch(url, { ...options, headers });
  }

  async function loadContent() {
    setBusy(true);
    setMessage("");

    try {
      const res = await apiFetch("/api/admin/content");
      const json = await res.json();
      if (json?.content) {
        setContent({ ...fallbackContent, ...json.content });
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to load content.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    verifyAdmin();
  }, []);

  useEffect(() => {
    if (ready) loadContent();
  }, [ready]);

  async function saveContent() {
    setBusy(true);
    setMessage("");

    try {
      const res = await apiFetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        throw new Error("Failed to save content");
      }

      setMessage("Homepage content saved.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to save content.");
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof HomeContent>(key: K, value: HomeContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  if (!ready) {
    return <div className="sfAdminShell"><div className="sfAdminBanner">Checking admin access...</div></div>;
  }

  return (
    <div className="sfAdminShell">
      <div className="sfAdminTop">
        <div>
          <h1 className="sfPageTitle">Content Editor</h1>
          <p className="sfMuted">Edit homepage wording live without touching code.</p>
        </div>

        <div className="sfInlineActions">
          <button className="sfGhostBtn" onClick={loadContent} disabled={busy}>Reload</button>
          <button className="sfPrimaryBtn" onClick={saveContent} disabled={busy}>
            {busy ? "Saving..." : "Save Content"}
          </button>
        </div>
      </div>

      {message ? <div className="sfBanner sfBannerSuccess">{message}</div> : null}

      <div className="sfPanel">
        <div className="sfPanelHeader">
          <h2 className="sfSectionTitle">Hero Section</h2>
        </div>

        <div className="sfFormGrid">
          <input className="sfInput" value={content.heroEyebrow} onChange={(e) => update("heroEyebrow", e.target.value)} placeholder="Eyebrow" />
          <input className="sfInput" value={content.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} placeholder="Hero title" />
        </div>

        <textarea className="sfTextarea" rows={4} value={content.heroSubtitle} onChange={(e) => update("heroSubtitle", e.target.value)} placeholder="Hero subtitle" />

        <div className="sfFormGrid">
          <input className="sfInput" value={content.primaryLabel} onChange={(e) => update("primaryLabel", e.target.value)} placeholder="Primary button label" />
          <input className="sfInput" value={content.primaryHref} onChange={(e) => update("primaryHref", e.target.value)} placeholder="Primary button href" />
          <input className="sfInput" value={content.secondaryLabel} onChange={(e) => update("secondaryLabel", e.target.value)} placeholder="Secondary button label" />
          <input className="sfInput" value={content.secondaryHref} onChange={(e) => update("secondaryHref", e.target.value)} placeholder="Secondary button href" />
        </div>
      </div>

      <div className="sfPanel">
        <div className="sfPanelHeader">
          <h2 className="sfSectionTitle">Collector Access Section</h2>
        </div>

        <input className="sfInput" value={content.loginHeading} onChange={(e) => update("loginHeading", e.target.value)} placeholder="Login heading" />
        <textarea className="sfTextarea" rows={4} value={content.loginText} onChange={(e) => update("loginText", e.target.value)} placeholder="Login text" />
      </div>

      <div className="sfPanel">
        <div className="sfPanelHeader">
          <h2 className="sfSectionTitle">Feature Cards</h2>
        </div>

        <div className="sfFeatureEditorGrid">
          <div className="sfMiniPanel">
            <input className="sfInput" value={content.feature1Icon} onChange={(e) => update("feature1Icon", e.target.value)} placeholder="Feature 1 icon" />
            <input className="sfInput" value={content.feature1Title} onChange={(e) => update("feature1Title", e.target.value)} placeholder="Feature 1 title" />
            <textarea className="sfTextarea" rows={4} value={content.feature1Text} onChange={(e) => update("feature1Text", e.target.value)} placeholder="Feature 1 text" />
          </div>

          <div className="sfMiniPanel">
            <input className="sfInput" value={content.feature2Icon} onChange={(e) => update("feature2Icon", e.target.value)} placeholder="Feature 2 icon" />
            <input className="sfInput" value={content.feature2Title} onChange={(e) => update("feature2Title", e.target.value)} placeholder="Feature 2 title" />
            <textarea className="sfTextarea" rows={4} value={content.feature2Text} onChange={(e) => update("feature2Text", e.target.value)} placeholder="Feature 2 text" />
          </div>

          <div className="sfMiniPanel">
            <input className="sfInput" value={content.feature3Icon} onChange={(e) => update("feature3Icon", e.target.value)} placeholder="Feature 3 icon" />
            <input className="sfInput" value={content.feature3Title} onChange={(e) => update("feature3Title", e.target.value)} placeholder="Feature 3 title" />
            <textarea className="sfTextarea" rows={4} value={content.feature3Text} onChange={(e) => update("feature3Text", e.target.value)} placeholder="Feature 3 text" />
          </div>
        </div>
      </div>
    </div>
  );
}
