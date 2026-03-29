
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PAGE_CONTENT_DEFAULTS, EditablePageKey } from "@/lib/content/defaults";

const supabase = createBrowserSupabaseClient();

const PAGE_ORDER: EditablePageKey[] = ["homepage", "scan", "manual", "collection", "analytics"];

export default function AdminContentPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pageKey, setPageKey] = useState<EditablePageKey>("homepage");
  const [content, setContent] = useState<Record<string, string>>({ ...PAGE_CONTENT_DEFAULTS.homepage });

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

  async function loadPageContent(nextPage: EditablePageKey) {
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/admin/content/${nextPage}`);
      const json = await res.json();
      setContent({ ...(PAGE_CONTENT_DEFAULTS[nextPage] as Record<string, string>), ...(json?.content || {}) });
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
    if (ready) loadPageContent(pageKey);
  }, [ready, pageKey]);

  async function saveContent() {
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/admin/content/${pageKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save content");
      setMessage(`${pageKey} content saved.`);
    } catch (error) {
      console.error(error);
      setMessage("Failed to save content.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="sfAdminShell"><div className="sfAdminBanner">Checking admin access...</div></div>;
  }

  return (
    <div className="sfAdminShell">
      <div className="sfAdminTop">
        <div>
          <h1 className="sfPageTitle">Content Editor</h1>
          <p className="sfMuted">Edit wording for homepage, scan, manual, collection, and analytics.</p>
        </div>

        <div className="sfInlineActions">
          <button className="sfGhostBtn" onClick={() => loadPageContent(pageKey)} disabled={busy}>Reload</button>
          <button className="sfPrimaryBtn" onClick={saveContent} disabled={busy}>
            {busy ? "Saving..." : "Save Content"}
          </button>
        </div>
      </div>

      {message ? <div className="sfBanner sfBannerSuccess">{message}</div> : null}

      <div className="sfPanel">
        <div className="sfToolbar">
          {PAGE_ORDER.map((key) => (
            <button
              key={key}
              className={pageKey === key ? "sfPrimaryBtn" : "sfGhostBtn"}
              onClick={() => setPageKey(key)}
              disabled={busy}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="sfPanel">
        <div className="sfPanelHeader">
          <h2 className="sfSectionTitle">Edit {pageKey} content</h2>
        </div>

        <div className="sfEditorGrid">
          {Object.entries(content).map(([key, value]) => (
            <div className="sfEditorField" key={key}>
              <label className="sfEditorLabel">{key}</label>
              {String(value).length > 90 ? (
                <textarea
                  className="sfTextarea"
                  rows={4}
                  value={value}
                  onChange={(e) => setContent((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              ) : (
                <input
                  className="sfInput"
                  value={value}
                  onChange={(e) => setContent((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
