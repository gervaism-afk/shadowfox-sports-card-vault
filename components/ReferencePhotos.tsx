"use client";
import { useEffect, useRef, useState } from "react";
import type { CardRecord } from "@/lib/types";
import { fillReferencePhotos, findReferencePhotos } from "@/lib/reference-photos";
export default function ReferencePhotos({ card, onChange }: { card: CardRecord; onChange: (card: CardRecord) => void }) {
  const [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const current = useRef(card); current.current = card;
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function fill() {
    const original = card; const run = new AbortController(); controller.current?.abort(); controller.current = run; setBusy(true); setStatus("");
    try {
      const photos = await findReferencePhotos(original, run.signal);
      if (current.current !== original) { setStatus("Card details changed. Search again with the updated details."); return; }
      const result = fillReferencePhotos(original, photos);
      if (result.added) { onChange(result.card); setStatus(`Filled ${result.added} reference image(s). Review before saving. Source and license are recorded in Notes.`); }
      else setStatus("No unique, openly licensed image matched the exact card and side. Existing photos are kept. You can save this card without photos.");
    } catch (e) { if (!run.signal.aborted) setStatus(e instanceof Error ? e.message : "Image search failed."); }
    finally { if (controller.current === run) setBusy(false); }
  }
  return <section className="fieldBlockWide"><h3>Reference photos</h3><p className="helperText">Fill missing front/back images from Wikimedia Commons where the exact card has an openly licensed match. Coverage is limited. These are reference images, not photos of your card’s condition.</p><button type="button" className="btn ghost" disabled={busy || !card.player || !card.year || !card.brand || !card.set || !card.cardNumber || (!!card.frontImage && !!card.backImage)} onClick={() => void fill()}>{busy ? "Finding reference images…" : "Auto-fill reference photos"}</button>{status ? <p role="status" className="helperText">{status}</p> : null}</section>;
}
