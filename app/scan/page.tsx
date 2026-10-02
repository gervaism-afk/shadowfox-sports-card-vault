"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import CardForm from "@/components/CardForm";
import SoldPriceEstimator from "@/components/SoldPriceEstimator";
import { emptyCard } from "@/lib/defaults";
import type { CardRecord } from "@/lib/types";
import { findDuplicate, increaseQuantity, saveCard } from "@/lib/storage";
import { prepareCardImage } from "@/lib/images";
import { recognizeCardImage } from "@/lib/ocr-browser";
import { computeConfidence, parseOcrText } from "@/lib/ocr";
import { applyOcrGuess } from "@/lib/scan";
import { supabase } from "@/lib/supabase";
import { identityFields, parseIdentification } from "@/lib/ai-identification";
import { duplicateKey, ebayActiveUrl, ebaySoldUrl } from "@/lib/matching";

export default function ScanPage() {
  const [card, setCard] = useState<CardRecord>(emptyCard);
  const [status, setStatus] = useState("Upload a clear photo of the card front to read its text.");
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [duplicate, setDuplicate] = useState<CardRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const router = useRouter();
  useEffect(() => () => { controller.current?.abort(); }, []);

  async function identify(value: CardRecord, signal: AbortSignal) {
    setStatus("AI is identifying the card…");
    const { data } = await supabase!.auth.getSession();
    const response = await fetch("/api/identify", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
      body: JSON.stringify({ frontImage: value.frontImage, backImage: value.backImage })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI identification is unavailable.");
    const identification = parseIdentification(result);
    if (signal.aborted) return;
    const defaults = emptyCard();
    const cleared = Object.fromEntries(identityFields.map(key => [key, defaults[key]]));
    setCard({ ...value, ...cleared, ...identification.fields, estimatedValueCad: 0 });
    setOcrText(identification.evidence); setAiWarnings(identification.warnings); setConfidence(null); setDuplicate(null);
    setStatus("AI details filled in. Review the match and edit any field before saving.");
  }

  async function rescan() {
    if (running.current || !card.frontImage) return;
    running.current = true; setBusy(true);
    const task = new AbortController(); controller.current = task;
    try { await identify(card, task.signal); }
    catch (error: any) { if (!task.signal.aborted) setStatus(error.message); }
    finally { running.current = false; if (!task.signal.aborted) setBusy(false); }
  }

  async function upload(file: File, back = false) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const task = new AbortController();
    controller.current = task;
    try {
      setStatus("Preparing image…");
      const image = await prepareCardImage(file);
      if (task.signal.aborted) return;
      if (back) {
        setCard((previous) => ({ ...previous, backImage: image }));
        setStatus("Back image loaded. Select Identify Again to use both photos; this will replace detected card details.");
        return;
      }
      // A new front photo starts a new card; no fields carry over from the last scan.
      const fresh = { ...emptyCard(), frontImage: image };
      setCard(fresh); setAiWarnings([]); setOcrText(""); setConfidence(null); setDuplicate(null);
      let aiError = "";
      try { await identify(fresh, task.signal); return; }
      catch (error: any) { if (task.signal.aborted) return; aiError = error.message || "AI identification is unavailable."; }
      const text = await recognizeCardImage(image, (message) => { if (!task.signal.aborted) setStatus(message); }, task.signal);
      if (task.signal.aborted) return;
      setOcrText(text);
      const guess = parseOcrText(text);
      const next = applyOcrGuess(fresh, guess);
      setCard(next);
      const score = computeConfidence(guess, text);
      setConfidence(score);
      setAiWarnings([aiError, "Local text reading was used. Card identity has not been verified by AI."]);
      setStatus(!text ? "No text found. Try a sharper photo or enter the fields below." : score < 0.45 ? "Some details could not be read. Review and complete the fields before saving." : "Text read. Review all fields before saving.");
    } catch (error: any) {
      if (!task.signal.aborted) setStatus(error.message || "Could not read this image. You can enter the fields below.");
    } finally {
      running.current = false;
      if (!task.signal.aborted) setBusy(false);
    }
  }

  async function save(addQuantity = false) {
    if (running.current) return;
    running.current = true; setBusy(true);
    try {
      if (!card.player.trim()) throw new Error("Enter the player's name before saving.");
      if (addQuantity && duplicate) await increaseQuantity(duplicate.id, card.quantity);
      else {
        if (!duplicate) {
          const match = await findDuplicate(card);
          if (match) { setDuplicate(match); setStatus("A matching card is already in your vault. Save separately or add its quantity."); return; }
        }
        await saveCard(card);
      }
      router.push("/collection");
    } catch (error: any) { setStatus(error.message || "Could not save card."); }
    finally { running.current = false; setBusy(false); }
  }

  return <AuthGate><PageShell title="Scan Cards">
    <section className="vaultHero">
      <div><div className="vaultEyebrow">Scan Workflow</div><h1 className="vaultTitle">Scan cards into your ShadowFox vault.</h1><p className="vaultText">Upload a photo for AI identification, review and edit the details, then save your card. A new front photo starts a new card.</p></div>
      <div className="vaultButtonRow"><button className="sfSecondaryBtn" onClick={() => router.push("/manual")}>Add Manually</button><button className="sfSecondaryBtn" onClick={() => router.push("/collection")}>View Collection</button></div>
    </section>
    <div className="layout2" style={{ alignItems: "start" }}>
      <section className="panel">
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="buttonRow">
            <label className="btn primary">Upload Front<input aria-label="Upload front image" hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></label>
            <label className="btn accent">Camera<input aria-label="Take card photo" hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></label>
            <label className="btn ghost">Add Back Image<input aria-label="Upload back image" hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file, true); }} /></label>
            <button type="button" className="btn ghost" disabled={!card.frontImage} onClick={() => void rescan()}>Identify Again</button>
          </div>
        </fieldset>
        <p className="helperText" role="status" aria-live="polite">{status}</p>
        <div className="layout2" style={{ marginTop: 16 }}><div className="previewCard cardFrame">{card.frontImage ? <img src={card.frontImage} alt="Front preview" /> : <span>Front preview</span>}</div><div className="previewCard cardFrame">{card.backImage ? <img src={card.backImage} alt="Back preview" /> : <span>Back preview</span>}</div></div>
      </section>
      <section className="panel">
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><CardForm value={card} onChange={(next) => { setCard(next); setDuplicate(null); }} showImageFields={false} /></fieldset>
        <div className="fieldBlockWide" style={{ marginTop: 16 }}><label className="label" htmlFor="ocr-text">Detected text</label><textarea id="ocr-text" className="input textarea" value={ocrText} readOnly placeholder="Text detected in your photo appears here." /></div>
        {aiWarnings.length ? <ul className="helperText">{aiWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : null}
        {confidence !== null ? <p className="helperText">Field completeness: {Math.round(confidence * 100)}% — review the detected details.</p> : null}
        <div className="buttonRow" style={{ marginTop: 12 }}><a className="btn ghost" href={ebayActiveUrl(card)} target="_blank" rel="noreferrer">View Active Listings</a><a className="btn ghost" href={ebaySoldUrl(card)} target="_blank" rel="noreferrer">View Sold Listings</a></div>
        <SoldPriceEstimator key={duplicateKey(card)} card={card} disabled={busy} onApply={(value) => setCard((previous) => ({ ...previous, estimatedValueCad: value }))} />
        {duplicate ? <p className="helperText">Matching card: {duplicate.player} {duplicate.year} {duplicate.brand} #{duplicate.cardNumber}.</p> : null}
        <div className="buttonRow" style={{ marginTop: 16 }}><button className="btn primary" disabled={busy} onClick={() => save()}>{duplicate ? "Save Separately" : "Save Card"}</button>{duplicate ? <button className="btn ghost" disabled={busy} onClick={() => save(true)}>Add to Existing Quantity</button> : null}</div>
      </section>
    </div>
  </PageShell></AuthGate>;
}
