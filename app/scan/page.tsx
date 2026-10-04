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
import { identityFields, parseIdentification, type ReviewField } from "@/lib/ai-identification";
import { duplicateKey, ebayActiveUrl, ebaySoldUrl } from "@/lib/matching";

export default function ScanPage() {
  const [card, setCard] = useState<CardRecord>(emptyCard);
  const [status, setStatus] = useState("Upload the front and back, then select Identify Card.");
  const [reviewFields,setReviewFields]=useState<ReviewField[]>([]);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [duplicate, setDuplicate] = useState<CardRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!scanning) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [scanning]);
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
    setCard({ ...value, ...cleared, ...identification.fields, estimatedValueCad: 0,priceEvidence:null });
    setReviewFields(identification.reviewFields); setOcrText(identification.evidence); setAiWarnings(identification.warnings); setConfidence(null); setDuplicate(null);
    setStatus("AI details filled in. Review the match and edit any field before saving.");
  }

  async function rescan() {
    if (running.current || !card.frontImage) return;
    running.current = true; setBusy(true);
    const task = new AbortController(); controller.current = task;
    setScanning(true);
    try {
      try { await identify(card, task.signal); }
      catch (error: any) {
        if (task.signal.aborted) return;
        setAiWarnings([error.message || "AI is unavailable.", "Local text reading was used. Review the details carefully."]);
        const text = await recognizeCardImage(card.frontImage, message => { if (!task.signal.aborted) setStatus(message); }, task.signal);
        if (task.signal.aborted) return;
        const guess = parseOcrText(text);
        const next=applyOcrGuess(card, guess); setCard(next);
        setReviewFields((['player','year','brand','set','cardNumber','parallel'] as const).map(field=>({field,reason:next[field]?'Read with local OCR. Check this detail against the photo.':'Not identified by local OCR. Check your card.'}))); setOcrText(text); setConfidence(computeConfidence(guess, text));
        setStatus("Text read. Review and complete the fields before saving.");
      }
    } catch (error: any) {
      if (!task.signal.aborted) setStatus(/chunk|Loading.*failed/i.test(error.message) ? "The app was updated while this page was open. Refresh this page and upload your photos again, or enter the details below." : error.message);
    } finally { if (controller.current === task) { running.current = false; setBusy(false); setScanning(false); } }
  }

  function cancelScan() {
    controller.current?.abort();
    controller.current = null; running.current = false; setBusy(false); setScanning(false);
    setStatus("Identification stopped. Your photos are still here; enter details manually or try Identify Card again.");
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
        setStatus("Back photo ready. Select Identify Card to read both photos together.");
        return;
      }
      // A new front photo starts a new card; no fields carry over from the last scan.
      const fresh = { ...emptyCard(), frontImage: image };
      setCard(fresh); setReviewFields([]); setAiWarnings([]); setOcrText(""); setConfidence(null); setDuplicate(null);
      setStatus("Front photo ready. Add the back photo, then select Identify Card to read both in one scan.");
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

  return <AuthGate><PageShell>
    <section className="workflowPageHeader">
      <div><div className="vaultEyebrow">Capture your collection</div><h1 className="workflowTitle">A new card. <em>A new story.</em></h1><p className="workflowIntro">Add a photo, review the details, and make it part of your vault.</p></div>
      <div className="buttonRow"><button className="btn ghost" onClick={() => router.push("/manual")}>Add Manually</button><button className="btn ghost" onClick={() => router.push("/collection")}>View Collection</button></div>
    </section>
    <ol className="workflowSteps" aria-label="Add a card steps">
      <li className={card.frontImage ? "isComplete" : "isActive"}><span>01</span> Add photos</li>
      <li className={card.frontImage ? "isActive" : ""}><span>02</span> Review details</li>
      <li><span>03</span> Save to vault</li>
    </ol>
    <div className="workflowLayout">
      <section className="panel workflowPanel">
        <div className="workflowPanelHeading"><h2>Start with a clear photo</h2><span className="helperText">JPG, PNG or WebP</span></div>
        <p className="helperText">Add front and back photos first, then identify them together in one scan. A new front photo starts a new card.</p>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="buttonRow" style={{ marginTop: 18 }}>
            <label className="btn primary">Upload Front<input aria-label="Upload front image" className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></label>
            <label className="btn ghost">Take Front Photo<input aria-label="Take card photo" className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></label>
            <label className="btn ghost">Take Back Photo<input aria-label="Take back card photo" className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file, true); }} /></label>
            <label className="btn ghost">Upload Back<input aria-label="Upload back image" className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file, true); }} /></label>
            <button type="button" className="btn ghost" disabled={!card.frontImage} onClick={() => void rescan()}>Identify Card</button>
          </div>
        </fieldset>
        <p className="workflowNotice" role="status" aria-live="polite">{status}{scanning ? ` (${elapsed}s)` : ""}</p>
        {scanning ? <button type="button" className="btn ghost" onClick={cancelScan}>Stop identification</button> : null}
        <div className="workflowPhotoGrid">
          <figure className="workflowPhoto"><div className="workflowPhotoVisual">{card.frontImage ? <img src={card.frontImage} alt="Front preview" /> : <span>Your card front<br /><small>Upload a photo to begin</small></span>}</div><figcaption>Front <span>Required for identification</span></figcaption></figure>
          <figure className="workflowPhoto"><div className="workflowPhotoVisual">{card.backImage ? <img src={card.backImage} alt="Back preview" /> : <span>Your card back<br /><small>More detail, a better match</small></span>}</div><figcaption>Back <span>Optional</span></figcaption></figure>
        </div>
        <details className="workflowEvidence"><summary>Tips for a better scan</summary><p className="helperText">Use even light, keep the full card in view, and avoid glare. Leave the card number and player name readable. You can correct every field before saving.</p></details>
      </section>
      <section className="panel workflowPanel">
        <div className="workflowPanelHeading"><h2>Make the details yours</h2><span className="helperText">All fields are editable</span></div>
        {aiWarnings.length ? <div className="workflowNotice"><strong>Before you save</strong><ul>{aiWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div> : null}
        <p className="helperText">Check the player, card number, parallel and grade against your photos.</p>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><CardForm value={card} onChange={(next) => { setReviewFields(rows=>rows.filter(row=>next[row.field]===card[row.field])); setCard(next); setDuplicate(null); }} showImageFields={false} reviewFields={reviewFields} onReview={field=>setReviewFields(rows=>rows.filter(row=>row.field!==field))} /></fieldset>
        <details className="workflowEvidence"><summary>View detected text</summary><div className="fieldBlockWide"><label className="label" htmlFor="ocr-text">Detected text</label><textarea id="ocr-text" className="input textarea" value={ocrText} readOnly placeholder="Text detected in your photo appears here." /></div>{confidence !== null ? <p className="helperText">Field completeness: {Math.round(confidence * 100)}% — review the detected details.</p> : null}</details>
        <div className="buttonRow" style={{ marginTop: 12 }}><a className="btn ghost" href={ebayActiveUrl(card)} target="_blank" rel="noreferrer">View Active Listings</a><a className="btn ghost" href={ebaySoldUrl(card)} target="_blank" rel="noreferrer">View Sold Listings</a></div>
        <SoldPriceEstimator key={duplicateKey(card)} card={card} disabled={busy} onApply={(value,priceEvidence) => setCard((previous) => ({ ...previous, estimatedValueCad: value, priceEvidence }))} />
        {duplicate ? <p className="workflowNotice">Matching card: {duplicate.player} {duplicate.year} {duplicate.brand} #{duplicate.cardNumber}.</p> : null}
        <div className="workflowSaveBar"><span className="helperText">{busy ? "Working on your card…" : "Ready when your details are."}</span><div className="buttonRow"><button className="btn primary" disabled={busy} onClick={() => save()}>{duplicate ? "Save Separately" : "Save Card"}</button>{duplicate ? <button className="btn ghost" disabled={busy} onClick={() => save(true)}>Add to Existing Quantity</button> : null}</div></div>
      </section>
    </div>
  </PageShell></AuthGate>;
}
