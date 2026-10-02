"use client";
import { useId, useState } from "react";
import { estimateSoldPrices } from "@/lib/pricing";

export default function SoldPriceEstimator({ onApply, disabled = false }: { onApply: (value: number) => void; disabled?: boolean }) {
  const id = useId();
  const [prices, setPrices] = useState("");
  const [message, setMessage] = useState("");
  return <details className="softPanel" style={{ marginTop: 16 }}>
    <summary>Estimate from sold prices</summary>
    <p className="helperText">Use sold listings for the same card, version, and condition. Enter prices in CAD, one per line, excluding shipping.</p>
    <label className="label" htmlFor={id}>Sold prices in CAD</label>
    <textarea id={id} className="input textarea" disabled={disabled} value={prices} onChange={(event) => { setPrices(event.target.value); setMessage(""); }} placeholder={"25.00\n30.00\n28.50"} />
    <button type="button" className="btn ghost" disabled={disabled} onClick={() => {
      try {
        const estimate = estimateSoldPrices(prices);
        onApply(estimate.estimateCad);
        setMessage(`Applied median $${estimate.estimateCad.toFixed(2)} CAD from ${estimate.sampleCount} sold ${estimate.sampleCount === 1 ? "price" : "prices"} (range $${estimate.low.toFixed(2)}–$${estimate.high.toFixed(2)}). Save the card to keep this value.`);
      } catch (error: any) { setMessage(error.message); }
    }}>Apply Estimate</button>
    {message ? <p className="helperText" role="status">{message}</p> : null}
  </details>;
}
