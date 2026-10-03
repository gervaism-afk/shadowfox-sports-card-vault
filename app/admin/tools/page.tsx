"use client";
import { useState } from "react";
import Link from "next/link";
import { adminRequest } from "@/lib/admin-request";
import type { CatalogSet, CatalogSource } from "@/lib/catalog/types";
type Result = {
  players: number;
  teams: number;
  sets: CatalogSet[];
  sources: CatalogSource[];
  checkedAt: string;
};
export default function CatalogueTools() {
  const [sport, setSport] = useState("Hockey"),
    [year, setYear] = useState(String(new Date().getUTCFullYear())),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Result | null>(null),
    [message, setMessage] = useState("");
  async function load(refresh = false) {
    setBusy(true);
    setMessage(
      refresh ? "Refreshing public reference data…" : "Loading reference data…",
    );
    setResult(null);
    try {
      setResult(
        await adminRequest(
          `/api/admin/catalog?sport=${sport}&year=${encodeURIComponent(year)}`,
          { method: refresh ? "POST" : "GET" },
        ),
      );
      setMessage(
        refresh
          ? "Reference cache refreshed. Source labels show whether live or saved data was returned."
          : "Reference data loaded.",
      );
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sfAdminShell">
      <div>
        <h1 className="sfPageTitle">Catalogue tools</h1>
        <p className="vaultWelcomeCopy">
          Inspect NHL and MLB reference coverage and refresh the shared source
          cache.
        </p>
      </div>
      <section className="panel">
        <fieldset disabled={busy} className="adminFields">
          <label>
            Sport
            <select
              className="input"
              value={sport}
              onChange={(e) => {
                setSport(e.target.value);
                setResult(null);
              }}
            >
              <option value="Hockey">NHL / Hockey</option>
              <option value="Baseball">MLB / Baseball</option>
            </select>
          </label>
          <label>
            Year or season
            <input
              className="input"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setResult(null);
              }}
              placeholder="2026 or 2025-26"
            />
          </label>
          <div className="buttonRow">
            <button className="btn ghost" onClick={() => void load()}>
              Inspect catalogue
            </button>
            <button className="btn primary" onClick={() => void load(true)}>
              Refresh reference data
            </button>
          </div>
        </fieldset>
        <p className="helperText">
          Refresh updates cached public data. Saved personal checklists update
          when their owners select the published set again. It does not edit
          collection cards.
        </p>
        {message ? (
          <p role="status" className="workflowNotice">
            {message}
          </p>
        ) : null}
      </section>
      {result ? (
        <>
          <section className="panel">
            <h2>Reference coverage</h2>
            <p>
              {result.players.toLocaleString()} current players · {result.teams}{" "}
              teams · {result.sets.length} set listings
            </p>
            {result.sources.map((s) => (
              <p key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>{" "}
                · {s.status === "live" ? "Live source" : "Saved reference"} ·{" "}
                {new Date(s.checkedAt).toLocaleString()}
              </p>
            ))}
            <p className="helperText">
              Set listings are release names. Card-level checklist availability
              varies by release. Current team assignments do not identify
              historical card teams.
            </p>
          </section>
          <section className="panel">
            <h2>Published sets</h2>
            {result.sets.length ? (
              <ul className="adminSourceList">
                {result.sets.map((s) => (
                  <li key={s.url}>
                    <strong>
                      {s.year} · {s.brand} · {s.set}
                    </strong>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      View source
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No published sets returned for this selection.</p>
            )}
            <Link className="btn ghost" href="/sets">
              Open set completion
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
