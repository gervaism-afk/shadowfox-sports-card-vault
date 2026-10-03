"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-request";
type Status = {
  checkedAt: string;
  counts: { label: string; count: number | null; ok: boolean }[];
  storage: { ok: boolean; public: boolean };
  services: { name: string; configured: boolean; detail: string }[];
};
export default function SystemStatus() {
  const [data, setData] = useState<Status | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function load() {
    setBusy(true);
    setMessage("");
    try {
      setData(await adminRequest("/api/admin/system"));
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="sfAdminShell">
      <div className="sfAdminTop">
        <div>
          <h1 className="sfPageTitle">System status</h1>
          <p className="vaultWelcomeCopy">
            Check database access, photo storage and service configuration.
          </p>
        </div>
        <button
          className="btn ghost"
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? "Checking…" : "Check status"}
        </button>
      </div>
      {message ? (
        <p role="alert" className="workflowNotice">
          {message}
        </p>
      ) : null}
      {data ? (
        <>
          <section className="panel">
            <h2>Database</h2>
            <dl className="adminStatusList">
              {data.counts.map((c) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>{c.ok ? c.count?.toLocaleString() : "Unavailable"}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel">
            <h2>Photo storage</h2>
            <p>
              {data.storage.ok
                ? "Card image bucket available"
                : "Card image bucket unavailable"}
            </p>
            <p className="helperText">
              {data.storage.public
                ? "Images use public URLs. Collection records remain private."
                : "Bucket is private or could not be checked."}
            </p>
          </section>
          <section className="panel">
            <h2>Services</h2>
            <ul className="adminSourceList">
              {data.services.map((s) => (
                <li key={s.name}>
                  <div>
                    <strong>{s.name}</strong>
                    <small>{s.detail}</small>
                  </div>
                  <span>
                    {s.configured ? "Configured" : "Missing configuration"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="helperText">
              Configuration status does not guarantee provider access, credits
              or uptime. API keys are managed in Vercel.
            </p>
          </section>
          <p className="helperText">
            Checked {new Date(data.checkedAt).toLocaleString()}
          </p>
        </>
      ) : null}
    </div>
  );
}
