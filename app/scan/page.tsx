"use client";
import { useState } from "react";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import CardForm from "@/components/CardForm";
import { emptyCard } from "@/lib/defaults";
import { CardRecord } from "@/lib/types";
import { findDuplicate, increaseQuantity, saveCard } from "@/lib/storage";
import { fileToDataUrl } from "@/lib/utils";
import { computeConfidence, parseOcrText } from "@/lib/ocr";
import { ebayActiveUrl, ebaySoldUrl } from "@/lib/matching";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const [card, setCard] = useState<CardRecord>(() => emptyCard());
  const [status, setStatus] = useState("Preview stays visible for upload or camera/upload.");
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [duplicateMsg, setDuplicateMsg] = useState("");
  const [duplicateCardId, setDuplicateCardId] = useState("");
  const [activeLink, setActiveLink] = useState("");
  const [soldLink, setSoldLink] = useState("");
  const [pricingNote, setPricingNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function runOcr(file: File, dataUrl: string) {
    setStatus("Running OCR…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const json = await res.json();
      const text = String(json?.text || "");
      setOcrText(text);
      const parsed = parseOcrText(text);
      const conf = computeConfidence(parsed, text);
      setConfidence(conf);
      const nextCard: CardRecord = { ...card, frontImage: dataUrl, sport: parsed.sport || card.sport, player: card.player || parsed.player || "", year: card.year || parsed.year || "", brand: card.brand || parsed.brand || "", subset: card.subset || parsed.subset || "", cardNumber: card.cardNumber || parsed.cardNumber || "", team: card.team || parsed.team || "", rookie: parsed.rookie ?? card.rookie, autograph: parsed.autograph ?? card.autograph, relicPatch: parsed.relicPatch ?? card.relicPatch, serialNumber: card.serialNumber || parsed.serialNumber || "", gradingCompany: (card.gradingCompany || (parsed.gradingCompany as any) || card.gradingCompany), grade: card.grade || parsed.grade || "", updatedAt: new Date().toISOString() };
      setCard(nextCard);
      const match = await findDuplicate(nextCard);
      setDuplicateCardId(match?.id || "");
      setDuplicateMsg(match ? `Possible duplicate found: ${match.player} ${match.year} ${match.brand} #${match.cardNumber}. Choose whether to add quantity or save separately.` : "");
      setActiveLink(ebayActiveUrl(nextCard));
      setSoldLink(ebaySoldUrl(nextCard));
      try {
        const priceRes = await fetch("/api/pricing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: [nextCard.year, nextCard.player, nextCard.brand, nextCard.set, nextCard.subset, nextCard.cardNumber ? `#${nextCard.cardNumber}` : ""].filter(Boolean).join(" ") }) });
        const priceJson = await priceRes.json();
        if (priceJson?.estimateCad) {
          setCard((prev) => ({ ...prev, estimatedValueCad: Number(priceJson.estimateCad || 0) }));
          setPricingNote(`Estimated value auto-filled from sold listings: $${Number(priceJson.estimateCad).toFixed(2)} CAD (${priceJson.sampleCount || 0} matches)`);
        } else setPricingNote("No sold-price estimate found automatically.");
      } catch { setPricingNote("Pricing estimate could not be loaded automatically."); }
      setStatus(conf < 0.45 ? "OCR complete with low confidence. Please review fields carefully." : "OCR complete. Review fields, then save.");
    } catch (e: any) { setStatus(e?.message || "OCR failed. You can still fill fields manually."); }
  }

  return (
    <AuthGate>
      <PageShell title="Scan">
        <div className="layout2">
          <section className="panel">
            <div className="buttonRow">
              <label className="btn primary">Upload<input hidden type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const data = await fileToDataUrl(file); setCard((prev) => ({ ...prev, frontImage: data })); await runOcr(file, data); }} /></label>
              <label className="btn accent">Camera/Upload<input hidden type="file" accept="image/*" capture="environment" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const data = await fileToDataUrl(file); setCard((prev) => ({ ...prev, frontImage: data })); await runOcr(file, data); }} /></label>
              <button className="btn ghost" onClick={() => router.push("/manual")}>Add Manually</button>
              <label className="btn ghost">Add Back Image<input hidden type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const data = await fileToDataUrl(file); setCard((prev) => ({ ...prev, backImage: data })); setStatus("Back image loaded."); }} /></label>
            </div>
            <div className="helperText">{status}</div>
            <div className="layout2" style={{ marginTop: 16 }}>
              <div className="previewCard cardFrame">{card.frontImage ? <img src={card.frontImage} alt="Front preview" /> : <span>Front preview</span>}</div>
              <div className="previewCard cardFrame">{card.backImage ? <img src={card.backImage} alt="Back preview" /> : <span>Back preview</span>}</div>
            </div>
          </section>
          <section className="panel">
            <CardForm value={card} onChange={setCard} showImageFields={false} />
            <div className="fieldBlockWide" style={{ marginTop: 16 }}><label className="label">OCR Text</label><textarea className="input textarea" value={ocrText} readOnly placeholder="Detected text will appear here after upload/camera." /></div>
            {confidence !== null ? <div className="helperText" style={{ marginTop: 12 }}>OCR Confidence: <strong>{Math.round(confidence * 100)}%</strong></div> : null}
            {duplicateMsg ? <div className="helperText" style={{ marginTop: 8, color: "#ffd18f" }}>{duplicateMsg}</div> : null}
            {pricingNote ? <div className="helperText" style={{ marginTop: 8, color: "#9fe3b0" }}>{pricingNote}</div> : null}
            {(activeLink || soldLink) ? <div className="buttonRow" style={{ marginTop: 12 }}>{activeLink ? <a className="btn ghost" href={activeLink} target="_blank" rel="noreferrer">View Active Listings</a> : null}{soldLink ? <a className="btn ghost" href={soldLink} target="_blank" rel="noreferrer">View Sold Listings</a> : null}</div> : null}
            <div className="buttonRow" style={{ marginTop: 16 }}>
              <button className="btn primary" disabled={busy} onClick={async () => { try { setBusy(true); await saveCard({ ...card, updatedAt: new Date().toISOString() }); router.push("/collection"); } catch (e: any) { setStatus(e.message || "Failed to save"); } finally { setBusy(false); } }}>Save as New Card</button>
              {duplicateCardId ? <button className="btn ghost" disabled={busy} onClick={async () => { try { setBusy(true); await increaseQuantity(duplicateCardId, card.quantity || 1); router.push("/collection"); } catch (e: any) { setStatus(e.message || "Failed to increase quantity"); } finally { setBusy(false); } }}>Add to Existing Quantity</button> : null}
            </div>
          </section>
        </div>
      </PageShell>
    </AuthGate>
  );
}
