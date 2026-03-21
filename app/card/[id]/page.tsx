"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import AuthGate from "@/components/AuthGate";
import CardForm from "@/components/CardForm";
import { useParams, useRouter } from "next/navigation";
import { deleteCard, getCard, saveCard } from "@/lib/storage";
import { CardRecord } from "@/lib/types";
import { fileToDataUrl, recordTotal } from "@/lib/utils";
import { ebayActiveUrl, ebaySoldUrl } from "@/lib/matching";

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<CardRecord | null>(null);
  const [status, setStatus] = useState("");
  const [pricingNote, setPricingNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCard(params.id).then(setCard).catch((e) => setStatus(e.message || "Failed to load card"));
  }, [params.id]);

  async function refreshPriceEstimate() {
    if (!card) return;

    try {
      setBusy(true);
      setPricingNote("Refreshing sold-price estimate…");

      const currentCard = card;
      const query = [
        currentCard.year,
        currentCard.player,
        currentCard.brand,
        currentCard.set,
        currentCard.subset,
        currentCard.cardNumber ? `#${currentCard.cardNumber}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const json = await res.json();

      if (json?.estimateCad) {
        const next = {
          ...currentCard,
          estimatedValueCad: Number(json.estimateCad || 0),
          updatedAt: new Date().toISOString(),
        };
        setCard(next);
        await saveCard(next);
        setPricingNote(
          `Updated from sold listings: $${Number(json.estimateCad).toFixed(2)} CAD (${json.sampleCount || 0} matches)`
        );
      } else {
        setPricingNote("No sold-price estimate found.");
      }
    } catch (e: any) {
      setPricingNote(e.message || "Pricing refresh failed");
    } finally {
      setBusy(false);
    }
  }

  if (!card) {
    return (
      <AuthGate>
        <PageShell title="Card Detail">
          <section className="panel">{status || "Card not found."}</section>
        </PageShell>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <PageShell title="Card Detail">
        <div className="detailHero">
          <section className="panel fadeInUp">
            <div className="layout2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="previewCard cardFrame hoverLift fadeInUp">
                {card.frontImage ? <img src={card.frontImage} alt="Front" /> : <span>No front image</span>}
              </div>
              <div className="previewCard cardFrame hoverLift fadeInUp">
                {card.backImage ? <img src={card.backImage} alt="Back" /> : <span>No back image</span>}
              </div>
            </div>

            <div className="detailActionBar" style={{ marginTop: 16 }}>
              <label className="btn">
                Replace Front Image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const data = await fileToDataUrl(file);
                    setCard({ ...card, frontImage: data });
                  }}
                />
              </label>

              <label className="btn">
                Replace Back Image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const data = await fileToDataUrl(file);
                    setCard({ ...card, backImage: data });
                  }}
                />
              </label>
            </div>
          </section>

          <section className="panel fadeInUp">
            <div className="brandStripe"></div>
            {card.team ? (
              <div className="teamBadge" style={{ marginBottom: 12 }}>
                <span className="teamDot"></span>
                {card.team}
              </div>
            ) : null}

            <div className="detailSummary">
              <div className="metaCard">
                <label>Quantity</label>
                <strong>{card.quantity}</strong>
              </div>
              <div className="metaCard">
                <label>Each</label>
                <strong>${Number(card.estimatedValueCad || 0).toFixed(2)}</strong>
              </div>
              <div className="metaCard">
                <label>Total</label>
                <strong>${recordTotal(card).toFixed(2)}</strong>
              </div>
            </div>

            <CardForm value={card} onChange={setCard} />

            {status ? <div className="helperText" style={{ marginTop: 12 }}>{status}</div> : null}
            {pricingNote ? (
              <div className="helperText" style={{ marginTop: 12, color: "#9fe3b0" }}>
                {pricingNote}
              </div>
            ) : null}

            <div className="buttonRow" style={{ marginTop: 16 }}>
              <button className="btn accent" disabled={busy} onClick={refreshPriceEstimate}>
                Refresh Sold Price Estimate
              </button>
              <a className="btn ghost" href={ebayActiveUrl(card)} target="_blank" rel="noreferrer">
                View Active Listings
              </a>
              <a className="btn ghost" href={ebaySoldUrl(card)} target="_blank" rel="noreferrer">
                View Sold Listings
              </a>
            </div>

            <div className="buttonRow" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                onClick={async () => {
                  try {
                    setStatus("Saving changes…");
                    await saveCard({ ...card, updatedAt: new Date().toISOString() });
                    setStatus("Saved.");
                  } catch (e: any) {
                    setStatus(e.message || "Failed to save");
                  }
                }}
              >
                Edit / Save
              </button>

              <button
                className="btn danger"
                onClick={async () => {
                  try {
                    await deleteCard(card.id);
                    router.push("/collection");
                  } catch (e: any) {
                    setStatus(e.message || "Failed to delete");
                  }
                }}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      </PageShell>
    </AuthGate>
  );
}
