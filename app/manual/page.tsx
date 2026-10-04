"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import CardForm from "@/components/CardForm";
import { emptyCard } from "@/lib/defaults";
import { PAGE_CONTENT_DEFAULTS } from "@/lib/content/defaults";
import { findDuplicate, increaseQuantity, saveCard } from "@/lib/storage";
import type { CardRecord } from "@/lib/types";

export default function ManualPage() {
  const router = useRouter();
  const [card, setCard] = useState<CardRecord>(emptyCard);
  const [content, setContent] = useState(PAGE_CONTENT_DEFAULTS.manual);
  const [duplicate, setDuplicate] = useState<CardRecord | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/content/manual", { cache: "no-store" }).then((r) => r.json())
      .then((json) => setContent({ ...PAGE_CONTENT_DEFAULTS.manual, ...(json.content || {}) })).catch(() => {});
  }, []);
  async function save(separate = false, addQuantity = false) {
    setBusy(true); setStatus("");
    try {
      if (!card.player.trim()) throw new Error("Enter the player's name.");
      if (addQuantity && duplicate) await increaseQuantity(duplicate.id, card.quantity);
      else {
        if (!separate) {
          const match = await findDuplicate(card);
          if (match) { setDuplicate(match); return; }
        }
        await saveCard(card);
      }
      router.push("/collection");
    } catch (error: any) { setStatus(error.message || "Could not save card."); }
    finally { setBusy(false); }
  }
  return <AuthGate><PageShell>
    <div className="addCardExperience addCardManual">
    <header className="addCardHeader"><div><div className="vaultEyebrow">YOUR VAULT, ONE CARD AT A TIME</div><h1>Add a card</h1><p>No photo? No problem. Start with what you know.</p></div><a className="addCardExit" href="/collection">Close <span aria-hidden="true">×</span></a></header>
    <nav className="addCardModes" aria-label="How to add a card"><a href="/scan">Scan a card</a><span aria-current="page">Enter manually</span></nav>
    <section className="addCardDetailsPanel">
      <div className="workflowPanelHeading"><h2>Card details</h2><span className="helperText">Enter what you know</span></div>
      <p className="helperText">Start with the player, then add the set, card number, photos and anything that makes this card special. You can update it later.</p>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <CardForm collapsibleExtras value={card} onChange={(next) => { setCard(next); setDuplicate(null); }} />
      </fieldset>
      {status ? <p className="workflowNotice" role="alert">{status}</p> : null}
      {duplicate ? <p className="workflowNotice">A matching card is already in your vault. Add its quantity or save a separate card.</p> : null}
      <div className="addCardSaveBar"><span className="helperText">Everything can be edited later.</span><div className="buttonRow">
        <button className="btn primary" disabled={busy} onClick={() => save(!!duplicate)}>{duplicate ? "Save Separately" : content.saveLabel}</button>
        {duplicate ? <button className="btn ghost" disabled={busy} onClick={() => save(false, true)}>Add to Existing Quantity</button> : null}
      </div></div>
    </section>
    </div>
  </PageShell></AuthGate>;
}
