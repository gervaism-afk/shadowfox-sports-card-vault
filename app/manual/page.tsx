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
  return <AuthGate><PageShell title={content.title}>
    <section className="panel">
      <h1 className="sfPageHeading">{content.title}</h1><p className="sfPageIntro">{content.subtitle}</p>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <CardForm value={card} onChange={(next) => { setCard(next); setDuplicate(null); }} />
      </fieldset>
      {status ? <p role="alert">{status}</p> : null}
      {duplicate ? <p>A matching card is already in your vault. Add its quantity or save a separate card.</p> : null}
      <div className="buttonRow" style={{ marginTop: 16 }}>
        <button className="btn primary" disabled={busy} onClick={() => save(!!duplicate)}>{duplicate ? "Save Separately" : content.saveLabel}</button>
        {duplicate ? <button className="btn ghost" disabled={busy} onClick={() => save(false, true)}>Add to Existing Quantity</button> : null}
      </div>
    </section>
  </PageShell></AuthGate>;
}
