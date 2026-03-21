"use client";
import { useState } from "react";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import CardForm from "@/components/CardForm";
import { emptyCard } from "@/lib/defaults";
import { CardRecord } from "@/lib/types";
import { findDuplicate, increaseQuantity, saveCard } from "@/lib/storage";
import { useRouter } from "next/navigation";

export default function ManualPage() {
  const router = useRouter();
  const [card, setCard] = useState<CardRecord>(() => emptyCard());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState("");
  const [duplicateCardId, setDuplicateCardId] = useState("");

  return (
    <AuthGate>
      <PageShell title="Add Manually">
        <section className="panel">
          <div className="helperText" style={{ marginBottom: 16 }}>Manual adds allow front image, back image, or no image at all.</div>
          <CardForm value={card} onChange={setCard} />
          {status ? <div className="helperText" style={{ marginTop: 12 }}>{status}</div> : null}
          {duplicateMsg ? <div className="helperText" style={{ marginTop: 12, color: "#ffd18f" }}>{duplicateMsg}</div> : null}
          <div className="buttonRow" style={{ marginTop: 16 }}>
            <button className="btn ghost" disabled={busy} onClick={async () => { try { setBusy(true); const match = await findDuplicate(card); setDuplicateCardId(match?.id || ""); setDuplicateMsg(match ? `Possible duplicate found: ${match.player} ${match.year} ${match.brand} #${match.cardNumber}.` : "No duplicate found."); } catch (e: any) { setStatus(e.message || "Duplicate check failed"); } finally { setBusy(false); } }}>Check Duplicate</button>
            <button className="btn primary" disabled={busy} onClick={async () => { try { setBusy(true); setStatus("Saving to cloud…"); await saveCard({ ...card, updatedAt: new Date().toISOString() }); router.push("/collection"); } catch (e: any) { setStatus(e.message || "Failed to save"); } finally { setBusy(false); } }}>Save as New Card</button>
            {duplicateCardId ? <button className="btn ghost" disabled={busy} onClick={async () => { try { setBusy(true); setStatus("Increasing quantity…"); await increaseQuantity(duplicateCardId, card.quantity || 1); router.push("/collection"); } catch (e: any) { setStatus(e.message || "Failed to increase quantity"); } finally { setBusy(false); } }}>Add to Existing Quantity</button> : null}
          </div>
        </section>
      </PageShell>
    </AuthGate>
  );
}
