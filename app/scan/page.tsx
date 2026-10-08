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
import { usePhotoCrop } from "@/components/usePhotoCrop";
import { prepareCardImage } from "@/lib/images";
import { recognizeCardImage } from "@/lib/ocr-browser";
import { computeConfidence, parseOcrText } from "@/lib/ocr";
import { applyOcrGuess } from "@/lib/scan";
import { supabase } from "@/lib/supabase";
import { identityFields, parseIdentification, type ReviewField } from "@/lib/ai-identification";
import { duplicateKey, ebayActiveUrl, ebaySoldUrl } from "@/lib/matching";

export default function ScanPage() {
  const { chooseCrop, cropDialog } = usePhotoCrop();
  const [card, setCard] = useState<CardRecord>(emptyCard);
  const [status, setStatus] = useState("Add a front photo to get started.");
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
        const frontText = await recognizeCardImage(card.frontImage, message => { if (!task.signal.aborted) setStatus(`AI unavailable · ${message}`); }, task.signal);
        if (task.signal.aborted) return;
        const backText = card.backImage ? await recognizeCardImage(card.backImage, message => { if (!task.signal.aborted) setStatus(`Reading back photo · ${message}`); }, task.signal) : "";
        const text = [frontText,backText].filter(Boolean).join("\n");
        if (task.signal.aborted) return;
        const guess = parseOcrText(text);
        const next=applyOcrGuess(card, guess); setCard(next);
        setReviewFields((['player','year','brand','set','cardNumber','parallel'] as const).filter(field=>field!== 'parallel' || !!next.parallel).map(field=>({field,reason:next[field]?'Read from the photo with text recognition. Confirm this detail.':'Text recognition could not read this detail. Add the back photo or enter it manually.'})));  setOcrText(text); setConfidence(computeConfidence(guess, text));
        setStatus(text.trim() ? "Text-only scan ready. AI was unavailable; check the details read from your photos." : "No readable text found. Your photos are still here. Try clearer photos or enter the details manually.");
      }
    } catch (error: any) {
      if (!task.signal.aborted) setStatus(/chunk|Loading.*failed/i.test(error.message) ? "The app was updated while this page was open. Refresh this page and upload your photos again, or enter the details below." : error.message);
    } finally { if (controller.current === task) { running.current = false; setBusy(false); setScanning(false); if (!task.signal.aborted) document.getElementById("card-details")?.scrollIntoView({behavior:"smooth",block:"start"}); } }
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
      const prepared = await prepareCardImage(file);
      if (task.signal.aborted) return;
      const image = await chooseCrop(prepared, back ? "back photo" : "front photo");
      if (!image) { if (!task.signal.aborted) setStatus("Photo cancelled. Your previous photos are unchanged."); return; }
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
    {cropDialog}
    <div className="addCardExperience">
    <header className="addCardHeader"><div><div className="vaultEyebrow">YOUR VAULT, ONE CARD AT A TIME</div><h1>Add a card</h1><p>Snap it. Check the details. Make it yours.</p></div><a className="addCardExit" href="/collection">Close <span aria-hidden="true">×</span></a></header>
    <nav className="addCardModes" aria-label="How to add a card"><span aria-current="page">Scan a card</span><a href="/manual">Enter manually</a></nav>
    <ol className="addCardProgress" aria-label="Add a card steps"><li className={card.frontImage ? "done" : "active"}><a href="#card-photos"><span>1</span> Photos</a></li><li className={card.frontImage ? "active" : ""}><a href={card.frontImage ? "#card-details" : "/manual"}><span>2</span> Details</a></li><li><a href={card.frontImage ? "#card-save" : "/manual"}><span>3</span> Save</a></li></ol>
    <div className={`addCardLayout ${card.frontImage ? "hasDetails" : "photosOnly"}`}>
      <section className="addCardPhotoPanel" id="card-photos" aria-label="Card photos">
        <div className="addCardSectionHeading"><h2>Start with your card</h2><span>Front required · back optional</span></div>
        <fieldset disabled={busy} className="addCardPhotoFields">
          <div className="addCardPhotoTiles">
          {([false,true] as const).map(back => <div className={`addCardPhotoTile ${(back ? card.backImage : card.frontImage) ? "hasPhoto" : ""}`} key={String(back)}>
            <div className="addCardPhotoLabel"><strong>{back ? "Back" : "Front"}</strong><span>{(back ? card.backImage : card.frontImage) ? "✓ Added" : back ? "Extra detail" : "Start here"}</span></div>
            <div className="addCardPhotoVisual">{(back ? card.backImage : card.frontImage) ? <img src={back ? card.backImage : card.frontImage} alt={back ? "Back preview" : "Front preview"}/> : <div className="addCardPhotoEmpty"><span aria-hidden="true">＋</span><p>{back ? "Number & set details" : "Player & card design"}</p></div>}</div>
            <label className="btn primary">{back ? "Take Back Photo" : "Take Front Photo"}<input aria-label={back ? "Take back card photo" : "Take card photo"} className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)void upload(file,back);}}/></label>
            <label className="addCardUpload">Choose from photos<input aria-label={back ? "Upload back image" : "Upload front image"} className="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)void upload(file,back);}}/></label>
          </div>)}
          </div>
          <button type="button" className="btn primary addCardIdentify" disabled={!card.frontImage} onClick={()=>void rescan()}>Identify Card <span aria-hidden="true">↗</span></button>
        </fieldset>
        <p className="addCardPhotoHint">AI fills in the details. You stay in control.</p>
        <p className={`addCardStatus ${scanning ? "isWorking" : ""}`} role="status" aria-live="polite">{status}{scanning ? ` (${elapsed}s)` : ""}</p>
        {scanning ? <button type="button" className="btn ghost" onClick={cancelScan}>Stop identification</button> : null}
        <details className="addCardHelp"><summary>Photo tips</summary><p>Keep the whole card in view, use even light, and avoid glare. Add the back before identifying to help read the card number and set.</p></details>
      </section>
      {card.frontImage ? <section className="addCardDetailsPanel" id="card-details">
        <div className="workflowPanelHeading"><h2>Your card details</h2><span className="helperText">All fields are editable</span></div>
        {card.player ? <div className="addCardMatch">{card.frontImage ? <img src={card.frontImage} alt=""/> : null}<div><span>Review your card</span><strong>{card.player}</strong><p>{[card.year,card.brand,card.set,card.cardNumber ? `#${card.cardNumber}` : ""].filter(Boolean).join(" · ")}</p></div></div> : null}
        {aiWarnings.length ? <div className="workflowNotice"><strong>Before you save</strong><ul>{aiWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div> : null}
        <p className="helperText">Check the player, card number, parallel and grade against your photos.</p>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><CardForm value={card} onChange={(next) => { setReviewFields(rows=>rows.filter(row=>next[row.field]===card[row.field])); setCard(next); setDuplicate(null); }} showImageFields={false} collapsibleExtras reviewFields={reviewFields} onReview={field=>setReviewFields(rows=>rows.filter(row=>row.field!==field))} /></fieldset>
        <details className="addCardHelp"><summary>View detected text</summary><div className="fieldBlockWide"><label className="label" htmlFor="ocr-text">Detected text</label><textarea id="ocr-text" className="input textarea" value={ocrText} readOnly placeholder="Text detected in your photo appears here." /></div>{confidence !== null ? <p className="helperText">Field completeness: {Math.round(confidence * 100)}% — review the detected details.</p> : null}</details>
        <details className="addCardHelp"><summary>Pricing & market research · optional</summary>        <div className="buttonRow" style={{ marginTop: 12 }}><a className="btn ghost" href={ebayActiveUrl(card)} target="_blank" rel="noreferrer">View Active Listings</a><a className="btn ghost" href={ebaySoldUrl(card)} target="_blank" rel="noreferrer">View Sold Listings</a></div>
        <SoldPriceEstimator key={duplicateKey(card)} card={card} disabled={busy} onApply={(value,priceEvidence) => setCard((previous) => ({ ...previous, estimatedValueCad: value, priceEvidence }))} />
</details>
        {duplicate ? <p className="workflowNotice">Matching card: {duplicate.player} {duplicate.year} {duplicate.brand} #{duplicate.cardNumber}.</p> : null}
        <div className="addCardSaveBar" id="card-save"><span className="helperText">{busy ? "Working on your card…" : "Everything can be edited later."}</span><div className="buttonRow"><button className="btn primary" disabled={busy} onClick={() => save()}>{duplicate ? "Save Separately" : "Save Card"}</button>{duplicate ? <button className="btn ghost" disabled={busy} onClick={() => save(true)}>Add to Existing Quantity</button> : null}</div></div>
      </section> : null}
    </div>
    </div>
  </PageShell></AuthGate>;
}
