"use client";
import { useId, useRef, useState } from "react";
import type { CardRecord } from "@/lib/types";
export default function CollectionPdfExport({ cards, filtered, disabled, kind = "owned", title }: { cards: CardRecord[]; filtered: CardRecord[]; disabled: boolean; kind?: "owned" | "wanted"; title?: string }) {
  const dialog = useRef<HTMLDialogElement>(null); const id = useId();
  const [scope, setScope] = useState<"all" | "filtered">("all");
  const [paper, setPaper] = useState<"letter" | "a4">("letter");
  const [values, setValues] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function generate() {
    setBusy(true); setError("");
    try {
      const { createCollectionPdf } = await import("@/lib/collection-pdf");
      const response = await fetch("/shadowfox-logo.jpg");
      if (!response.ok) throw new Error("Could not load your logo. Try again.");
      const blob = await response.blob();
      const logo = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
      const pdf = createCollectionPdf(scope === "all" ? cards : filtered, { paper, kind, includeValues: kind === "wanted" ? false : values, scope: title ? `Binder: ${title}` : kind === "wanted" ? (scope === "all" ? "All wanted cards" : "Filtered wanted cards") : (scope === "all" ? "All cards" : "Filtered cards") }, logo);
      pdf.save(kind === "wanted" ? "shadowfox-want-list.pdf" : title ? "shadowfox-binder-checklist.pdf" : "shadowfox-collection-checklist.pdf");
      dialog.current?.close();
    } catch (e: any) { setError(/chunk/i.test(e.message) ? "The app has been updated. Refresh and try the PDF export again." : e.message || "Could not create the PDF. Try again."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" disabled={disabled || !cards.length} onClick={() => { setError(""); dialog.current?.showModal(); }}>Print / PDF</button>
    <dialog ref={dialog} className="pdfDialog" aria-labelledby={`${id}-title`}>
      <div className="pdfDialogHeading"><h2 id={`${id}-title`}>{kind === "wanted" ? "Print your want list" : title ? "Print your binder" : "Print your collection"}</h2><button type="button" className="btn ghost" aria-label="Close PDF options" disabled={busy} onClick={() => dialog.current?.close()}>Close</button></div>
      <p className="helperText">A clean checklist with your logo, organized by sport, year and set. Card numbers, players, quantities and variants are included. Check boxes on paper or in a PDF reader.</p>
      <form className="authForm" onSubmit={e => { e.preventDefault(); void generate(); }}>
        <label className="label" htmlFor={`${id}-scope`}>Cards to include</label><select className="input" id={`${id}-scope`} value={scope} onChange={e => setScope(e.target.value as "all" | "filtered")} disabled={busy}><option value="all">{kind === "wanted" ? "Entire want list" : title ? title : "Entire collection"} ({cards.length} entries)</option><option value="filtered">Current filtered cards ({filtered.length} entries)</option></select>
        <label className="label" htmlFor={`${id}-paper`}>Paper size</label><select className="input" id={`${id}-paper`} value={paper} onChange={e => setPaper(e.target.value as "letter" | "a4")} disabled={busy}><option value="letter">Letter (8.5 × 11 inches)</option><option value="a4">A4</option></select>
        {kind === "owned" ? <label className="checkRow"><input type="checkbox" checked={values} disabled={busy} onChange={e => setValues(e.target.checked)} /><span>Include saved CAD estimates</span></label> : null}
        <p className="helperText">{kind === "wanted" ? "Includes your wanted cards only; these do not count as owned cards." : "Includes saved cards only; missing cards from a full set checklist are not added."}</p>
        {error ? <p className="workflowNotice" role="alert">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy || !(scope === "all" ? cards.length : filtered.length)}>{busy ? "Creating PDF…" : "Download PDF"}</button>
      </form>
    </dialog>
  </>;
}
