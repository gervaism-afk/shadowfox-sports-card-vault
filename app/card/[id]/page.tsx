"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import CardForm from "@/components/CardForm";
import AutomaticSoldPrices from "@/components/AutomaticSoldPrices";
import SoldPriceEstimator from "@/components/SoldPriceEstimator";
import { useParams, useRouter } from "next/navigation";
import { deleteCard, getCard, saveCard } from "@/lib/storage";
import { CardRecord } from "@/lib/types";
import { recordTotal } from "@/lib/utils";
import { prepareCardImage } from "@/lib/images";
import { duplicateKey, ebayActiveUrl, ebaySoldUrl } from "@/lib/matching";

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<CardRecord | null>(null);
  const [savedCard, setSavedCard] = useState<CardRecord | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");
  const editHeading = useRef<HTMLHeadingElement>(null);
  const photoTask = useRef(0);

  useEffect(() => {
    let active = true;
    photoTask.current += 1;
    setCard(null); setSavedCard(null); setStatus(""); setEditing(false); setSide("front"); setLoading(true); setBusy(false);
    getCard(params.id).then((loaded) => { if (active) { setCard(loaded); setSavedCard(loaded); } })
      .catch((e) => { if (active) setStatus(e.message || "Failed to load card"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; photoTask.current += 1; };
  }, [params.id]);

  useEffect(() => {
    if (editing) {
      editHeading.current?.focus({ preventScroll: true });
      editHeading.current?.scrollIntoView({ block: "start" });
    }
  }, [editing]);

  async function replacePhoto(file: File, nextSide: "front" | "back") {
    const task = ++photoTask.current;
    setBusy(true); setStatus("Preparing photo…");
    try {
      const data = await prepareCardImage(file);
      if (task !== photoTask.current) return;
      setCard((previous) => previous ? { ...previous, [nextSide === "front" ? "frontImage" : "backImage"]: data } : previous);
      setSide(nextSide); setStatus("Photo updated. Save Changes to keep it.");
    } catch (error: any) {
      if (task === photoTask.current) setStatus(error.message || "Could not prepare this photo. Try another image.");
    } finally {
      if (task === photoTask.current) setBusy(false);
    }
  }

  if (!card) {
    return (
      <AuthGate>
        <PageShell>
          <section className="workflowPageHeader"><div><div className="vaultEyebrow">Your collection</div><h1 className="workflowTitle">Card detail</h1></div></section>
          <section className="panel" role="status">{loading ? "Opening your card…" : status || "Card not found."}</section>
          <Link className="btn ghost" href="/collection">Back to Collection</Link>
        </PageShell>
      </AuthGate>
    );
  }

  const image = side === "front" ? card.frontImage : card.backImage;
  const hasEstimate = Number(card.estimatedValueCad || 0) > 0;
  const details = [
    ["Sport", card.sport], ["Team", card.team], ["Year", card.year], ["Brand", card.brand],
    ["Set", card.set], ["Subset", card.subset], ["Card number", card.cardNumber ? `#${card.cardNumber}` : ""],
    ["Parallel", card.parallel], ["Serial number", card.serialNumber],
    ["Grade", [card.gradingCompany, card.grade].filter(Boolean).join(" ")],
  ].filter(([, value]) => value);

  return (
    <AuthGate>
      <PageShell>
        <section className="workflowPageHeader">
          <div><Link className="vaultEyebrow" href="/collection">← Your collection</Link><h1 className="workflowTitle">{card.player || "Untitled card"}</h1><p className="workflowIntro">{[card.year, card.brand, card.set].filter(Boolean).join(" · ") || "A card in your ShadowFox vault."}</p></div>
          {!editing ? <button className="btn primary" aria-expanded={false} aria-controls="card-edit-panel" onClick={() => { setEditing(true); setStatus(""); }}>Edit card</button> : <span className="helperText">Editing card details</span>}
        </section>

        <div className="detailLayout">
          <section className="panel workflowPanel">
            <div className="detailImageStage">{image ? <img src={image} alt={`${side === "front" ? "Front" : "Back"} of ${card.player || "card"}`} /> : <span>No {side} image added</span>}</div>
            <div className="detailImageSwitch" aria-label="Card photos"><button className={side === "front" ? "isActive" : ""} aria-pressed={side === "front"} onClick={() => setSide("front")}>Front</button><button className={side === "back" ? "isActive" : ""} aria-pressed={side === "back"} onClick={() => setSide("back")}>Back</button></div>
            {editing ? <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><div className="buttonRow" style={{ marginTop: 20 }}>
              <label className="btn ghost">Replace Front Image<input aria-label="Replace front image" className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void replacePhoto(file, "front"); }} /></label>
              <label className="btn ghost">Replace Back Image<input aria-label="Replace back image" className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void replacePhoto(file, "back"); }} /></label>
            </div><p className="helperText">Photo changes are kept when you save.</p></fieldset> : null}
          </section>

          <section className="panel workflowPanel">
            <div className="workflowPanelHeading"><h2>The card at a glance</h2><span className="helperText">{editing ? "Your current edits" : "Saved in your vault"}</span></div>
            <div className="pillRow">{card.rookie ? <span className="teamBadge">Rookie</span> : null}{card.autograph ? <span className="teamBadge">Autograph</span> : null}{card.relicPatch ? <span className="teamBadge">Relic / Patch</span> : null}{card.gradingCompany ? <span className="teamBadge">{card.gradingCompany} {card.grade}</span> : null}</div>
            <div className="detailSummary">
              <div className="metaCard"><span className="kpiLabel">Quantity</span><strong>{card.quantity}</strong></div>
              <div className="metaCard"><span className="kpiLabel">Each estimate · CAD</span><strong>{hasEstimate ? `$${Number(card.estimatedValueCad).toFixed(2)}` : "No estimate"}</strong></div>
              <div className="metaCard"><span className="kpiLabel">Total estimate · CAD</span><strong>{hasEstimate ? `$${recordTotal(card).toFixed(2)}` : "No estimate"}</strong></div>
            </div>
            <p className="helperText">{hasEstimate ? "Value reflects your saved estimate." : "Add an estimate when you edit your card."}</p>
            <dl className="detailInfoGrid">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            {card.notes ? <div className="detailNotes"><h3>Your notes</h3><p>{card.notes}</p></div> : null}
            {card.priceEvidence && card.priceEvidence.estimateCad===card.estimatedValueCad?<section className="softPanel priceEvidence"><h3>Estimate details</h3><p className="helperText">{card.priceEvidence.method==='manual'?'Manually entered':'Sales reviewed'} {new Date(card.priceEvidence.checkedAt).toLocaleString()} · {card.priceEvidence.sales.length} supporting sales</p>{card.priceEvidence.sourceUrl?<a href={card.priceEvidence.sourceUrl} target="_blank" rel="noopener noreferrer">{card.priceEvidence.sourceLabel}</a>:<p className="helperText">{card.priceEvidence.sourceLabel}</p>}{card.priceEvidence.fxRate?<p className="helperText">USD conversion: {card.priceEvidence.fxRate.toFixed(4)} CAD per USD · rate dated {card.priceEvidence.fxDate}</p>:null}{card.priceEvidence.sales.length?<details><summary>View supporting sales</summary><ul>{card.priceEvidence.sales.map((sale,index)=><li key={index}>{sale.currency} ${sale.amount.toFixed(2)} · {sale.context}</li>)}</ul><p className="helperText">Selected by the collector; not independently verified by ShadowFox.</p></details>:null}</section>:hasEstimate?<p className="helperText">No review date or supporting sales saved for this estimate.</p>:null}
            {!editing?<AutomaticSoldPrices key={duplicateKey(card)} cardId={card.id}/>:null}
            <div className="buttonRow"><Link className="btn ghost" href={`/transactions?card=${card.id}`}>Record purchase or sale</Link><a className="btn ghost" href={ebayActiveUrl(card)} target="_blank" rel="noreferrer">View Active Listings</a><a className="btn ghost" href={ebaySoldUrl(card)} target="_blank" rel="noreferrer">View Sold Listings</a></div>
          </section>
        </div>

        {status ? <p className="workflowNotice" role="status">{status}</p> : null}
        {editing ? <section id="card-edit-panel" className="panel workflowPanel detailEditPanel">
          <div className="workflowPanelHeading"><h2 ref={editHeading} tabIndex={-1}>Edit your card</h2><span className="helperText">Review, then save your changes</span></div>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><CardForm value={card} onChange={setCard} showImageFields={false} /></fieldset>
          <SoldPriceEstimator key={duplicateKey(card)} card={card} disabled={busy} onApply={(value,priceEvidence) => setCard((previous) => previous ? { ...previous, estimatedValueCad: value, priceEvidence } : previous)} />
          <div className="workflowSaveBar"><span className="helperText">Changes stay on this page until you save.</span><div className="buttonRow">
            <button className="btn ghost" disabled={busy} onClick={() => { setCard(savedCard); setEditing(false); setStatus(""); }}>Cancel</button>
            <button className="btn primary" disabled={busy} onClick={async () => {
              try {
                setStatus("Saving changes…"); setBusy(true);
                const saved = await saveCard({ ...card, updatedAt: new Date().toISOString() });
                setCard(saved); setSavedCard(saved); setEditing(false); setStatus("Saved.");
              } catch (e: any) { setStatus(e.message || "Failed to save"); }
              finally { setBusy(false); }
            }}>Save Changes</button>
          </div></div>
          <div className="detailDangerZone"><div><h3>Remove this card</h3><p className="helperText">Delete this card and its saved details from your vault.</p></div><button className="btn danger" disabled={busy} onClick={async () => {
            try { setBusy(true); await deleteCard(card.id); router.push("/collection"); }
            catch (e: any) { setStatus(e.message || "Failed to delete"); }
            finally { setBusy(false); }
          }}>Delete</button></div>
        </section> : null}
      </PageShell>
    </AuthGate>
  );
}
