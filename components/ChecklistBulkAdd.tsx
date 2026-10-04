"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CardRecord } from "@/lib/types";
import { completion, matchingChecklistCards, type SetChecklist } from "@/lib/set-completion";
import { emptyCard } from "@/lib/defaults";
import { loadCards, insertChecklistCards, saveReferencePhotos } from "@/lib/storage";
import { restoreId } from "@/lib/collection-backup";
import { duplicateKey } from "@/lib/matching";
import { fillReferencePhotos, findReferencePhotos } from "@/lib/reference-photos";
export default function ChecklistBulkAdd({ list, cards, userId, busy, setBusy, onCards, selected, setSelected }: { selected: string[]; setSelected: (values: string[]) => void; list: SetChecklist; cards: CardRecord[]; userId: string; busy: boolean; setBusy: (busy: boolean) => void; onCards: (cards: CardRecord[]) => void }) {
  const [review, setReview] = useState(false), [images, setImages] = useState(false), [status, setStatus] = useState("");
  const missing = useMemo(() => completion(cards, list).missing, [cards, list]);
  const stopped = useRef(false), activeUser = useRef(userId); activeUser.current = userId;
  useEffect(() => { stopped.current = false; return () => { stopped.current = true; }; }, []);
  async function add() {
    if (busy) return;
    setBusy(true); stopped.current = false; setReview(false); let count = 0, imageCount = 0;
    try {
      let latest: CardRecord[];
      let photos: Awaited<ReturnType<typeof findReferencePhotos>> = [];
      if (images) {
        setStatus("Looking for openly licensed reference images…");
        try { photos = await findReferencePhotos({ year: list.year, brand: list.brand, set: list.set_name }); } catch { setStatus("Image source unavailable. Adding cards without reference photos…"); }
      }
      latest = await loadCards();
      const entries = list.entries.filter(e => selected.includes(e.number) && !matchingChecklistCards(latest, list, e).length);
      for (let offset = 0; offset < entries.length; offset += 100) {
        if (stopped.current || activeUser.current !== userId) break;
        const batch = await Promise.all(entries.slice(offset, offset + 100).map(async entry => {
          let card: CardRecord = { ...emptyCard(), sport: list.sport, year: list.year, brand: list.brand, set: list.set_name, subset: entry.subset ?? list.subset, parallel: entry.parallel ?? list.parallel, cardNumber: entry.number, player: entry.player || `Card #${entry.number}`, team: entry.team, rookie: entry.rookie ?? false, autograph: entry.autograph ?? false, relicPatch: entry.relicPatch ?? false, quantity: 1, notes: "Added from set checklist." };
          card.id = await restoreId(userId, "checklist-card:" + duplicateKey(card));
          if (latest.some(existing => existing.id === card.id)) card.id = crypto.randomUUID();
          const filled = fillReferencePhotos(card, photos); imageCount += filled.added; return filled.card;
        }));
        if (stopped.current || activeUser.current !== userId) break;
        setStatus(`Adding cards ${offset + 1}–${offset + batch.length} of ${entries.length}…`);
        await insertChecklistCards(batch, userId); count += batch.length;
      }
      latest = await loadCards();
      if (activeUser.current === userId && !stopped.current) { onCards(latest); setSelected([]); setStatus(`Collection updated: ${count} missing card(s) added with quantity 1. Already owned cards kept their quantities.${images ? ` ${imageCount} reference image(s) matched; other sides remain blank.` : ""}`); }
    } catch (e) { if (activeUser.current === userId && !stopped.current) { setStatus(`${e instanceof Error ? e.message : "Could not finish adding cards."} Any completed batches are saved; retry skips owned cards.`); try { onCards(await loadCards()); } catch {} } }
    finally { if (activeUser.current === userId && !stopped.current) setBusy(false); }
  }
  async function fillOwned() {
    if (busy) return; setBusy(true); stopped.current = false; let total = 0;
    try {
      setStatus("Finding reference photos for owned cards in this checklist…");
      const photos = await findReferencePhotos({ year: list.year, brand: list.brand, set: list.set_name });
      const latest = await loadCards();
      const ids = new Set(list.entries.flatMap(e => matchingChecklistCards(latest, list, e).map(c => c.id)));
      for (const card of latest.filter(c => ids.has(c.id))) {
        if (stopped.current || activeUser.current !== userId) break;
        const filled = fillReferencePhotos(card, photos);
        if (filled.added && await saveReferencePhotos(card, filled.card, userId)) total += filled.added;
      }
      if (activeUser.current === userId && !stopped.current) { onCards(await loadCards()); setStatus(total ? `Filled ${total} reference image(s). Existing photos were kept. Sources and licenses are in each card’s Notes.` : "No exact, unique openly licensed front/back images found for these cards. Your collection and existing photos were kept."); }
    } catch (e) { if (!stopped.current) setStatus(e instanceof Error ? e.message : "Image lookup failed."); }
    finally { if (activeUser.current === userId && !stopped.current) setBusy(false); }
  }
  return <section id="checklist-add-controls" className="checklistAddPanel"><h3>Add cards to your collection</h3><p className="selectionCount" aria-live="polite">{selected.length} card{selected.length === 1 ? "" : "s"} selected</p><p className="helperText">Add one copy of each selected missing card. The entire collection is checked again before adding; owned cards and their quantities are kept.</p><div className="buttonRow"><button className="btn primary" disabled={busy || !missing.length} onClick={() => { setSelected(missing.map(e => e.number)); setReview(true); }}>Add complete set</button><button className="btn ghost" disabled={busy || !missing.length} onClick={() => setSelected(missing.map(e => e.number))}>Select all missing</button>{selected.length ? <button className="btn ghost" disabled={busy} onClick={() => setSelected([])}>Clear selection</button> : null}{selected.length ? <button className="btn ghost" disabled={busy} onClick={() => setReview(true)}>Add selected cards ({selected.length})</button> : null}</div><label className="checkRow"><input type="checkbox" checked={images} disabled={busy} onChange={e => setImages(e.target.checked)}/><span>Auto-fill available open reference photos when adding</span></label>{review ? <div><p>Add {selected.length} selected card(s) to your collection? Cards already owned are skipped. No purchase price or condition is assumed.</p><ul className="selectedCardPreview">{list.entries.filter(entry => selected.includes(entry.number)).slice(0, 8).map(entry => <li key={entry.number}>#{entry.number} · {entry.player || "Unnamed card"}</li>)}</ul>{selected.length > 8 ? <p className="helperText">And {selected.length - 8} more selected cards.</p> : null}<div className="buttonRow"><button className="btn primary" disabled={busy || !selected.length} onClick={() => void add()}>Add {selected.length} cards to collection</button><button className="btn ghost" onClick={() => setReview(false)}>Cancel</button></div></div> : null}<details><summary>Reference photos for owned cards</summary><h3>Photos for cards already owned</h3><p className="helperText">Find exact front/back reference images from Wikimedia Commons where openly licensed scans are available. Missing or ambiguous matches stay blank. This source does not cover every release; reference photos do not show your copy’s condition.</p><button className="btn ghost" disabled={busy} onClick={() => void fillOwned()}>Auto-fill missing set photos</button></details>{status ? <p role="status" className="helperText">{status}</p> : null}</section>;
}
