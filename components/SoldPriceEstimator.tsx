"use client";
import { validatePriceEvidence, type PriceEvidence } from '@/lib/price-evidence';
import { useEffect, useId, useRef, useState } from "react";
import { estimateConfirmedSales, estimateSoldPrices, parsePastedSaleAmounts, parseUsdCadRate, type PastedSaleAmount, type SaleCurrency } from "@/lib/pricing";
import { ebayQuery } from "@/lib/matching";
import type { CardRecord } from "@/lib/types";

export default function SoldPriceEstimator({ card, onApply, disabled = false }: { card: Partial<CardRecord>; onApply: (value: number,evidence:PriceEvidence) => void; disabled?: boolean }) {
  const id = useId();
  const [sourceUrl,setSourceUrl]=useState('https://130point.com/sales/');
  const [fx,setFx]=useState<{rate:number;date:string}|null>(null);
  function evidence(value:number,sales:PriceEvidence['sales']):PriceEvidence {
    return validatePriceEvidence({checkedAt:new Date().toISOString(),method:'reviewed-sales',sourceLabel:'User-reviewed sold prices',sourceUrl:sourceUrl.trim(),estimateCad:value,sales,...(fx?{fxRate:fx.rate,fxDate:fx.date}:{})},value)!;
  }
  const [prices, setPrices] = useState("");
  const [pasted, setPasted] = useState("");
  const [currency, setCurrency] = useState<SaleCurrency>('USD');
  const [amounts, setAmounts] = useState<PastedSaleAmount[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<ReturnType<typeof estimateSoldPrices> | null>(null);
  const [rateNote, setRateNote] = useState('');
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const query = ebayQuery(card);
  function resetPreview() { setPreview(null); setRateNote(''); setFx(null); setMessage(''); }
  function resetPaste() { setAmounts([]); setSelected([]); resetPreview(); }
  async function calculate() {
    const included = amounts.filter(sale => selected.includes(sale.id));
    if (!included.length) { setMessage('Select the actual sold prices you want to include.'); return; }
    const task = new AbortController(); controller.current = task; setLoading(true); resetPreview();
    try {
      let rate: number | undefined;
      let note = '';
      if (included.some(sale => sale.currency === 'USD')) {
        const response = await fetch('/api/pricing/exchange-rate', { signal: task.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load the exchange rate.');
        const fx = parseUsdCadRate({ observations: [{ d: result.date, FXUSDCAD: { v: result.rate } }] });
        rate = fx.rate; setFx(fx);
        note = `USD converted at ${fx.rate.toFixed(4)} CAD per USD, Bank of Canada rate dated ${fx.date}. This uses a recent rate, not each sale's historical rate.`;
      }
      if (task.signal.aborted) return;
      setPreview(estimateConfirmedSales(included, rate)); setRateNote(note);
    } catch (error: any) { if (!task.signal.aborted) setMessage(error.message || 'Could not calculate an estimate.'); }
    finally { if (!task.signal.aborted) setLoading(false); }
  }
  return <details className="softPanel" style={{ marginTop: 16 }}>
    <summary>Estimate from sold prices</summary>
    <fieldset disabled={disabled || loading} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <p className="helperText">Look up the same card, parallel, and condition on 130point. Copy the search text, open the site, then paste results here.</p>
      <label className="label" htmlFor={`${id}-query`}>Card search text</label>
      <input id={`${id}-query`} className="input" value={query} readOnly placeholder="Enter the card details above to build a search." />
      <div className="buttonRow" style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost" disabled={!query} onClick={async () => {
          try { await navigator.clipboard.writeText(query); setMessage('Search text copied. Paste it into the search box on 130point.'); }
          catch { setMessage('Select and copy the card search text above.'); }
        }}>Copy Search Text</button>
        <a className="btn ghost" href="https://130point.com/sales/" target="_blank" rel="noreferrer">Open 130point</a>
      </div>
      <label className="label" htmlFor={`${id}-source`}>Source link (optional)</label><input id={`${id}-source`} className="input" type="url" maxLength={1000} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://…" />
      <label className="label" htmlFor={`${id}-paste`} style={{ marginTop: 16 }}>Paste sold results</label>
      <textarea id={`${id}-paste`} className="input textarea" maxLength={30000} value={pasted} onChange={event => { setPasted(event.target.value); resetPaste(); }} placeholder={"Paste copied results or prices, for example:\nSold price: US $25.00\nSold price: CAD $38.00"} />
      <label className="label" htmlFor={`${id}-currency`}>Currency for amounts without a currency code</label>
      <select id={`${id}-currency`} className="input" value={currency} onChange={event => { setCurrency(event.target.value as SaleCurrency); resetPaste(); }}><option value="USD">USD — US dollars</option><option value="CAD">CAD — Canadian dollars</option></select>
      <button type="button" className="btn ghost" style={{ marginTop: 8 }} onClick={() => {
        try { const result = parsePastedSaleAmounts(pasted, currency); setAmounts(result.amounts); setSelected([]); resetPreview(); setMessage(`Found ${result.amounts.length} amounts to review.${result.skipped ? ` Skipped ${result.skipped} shipping, fee, or unsupported amounts.` : ''} Select actual sold prices for matching cards; exclude asking prices, shipping, and lots.`); }
        catch (error: any) { setMessage(error.message); }
      }}>Review Pasted Prices</button>
      {amounts.length ? <div style={{ marginTop: 12 }}>
        <p className="helperText">Amounts are extracted from your paste; the app has not verified the sales. Include only completed sales for the same card and condition.</p>
        {amounts.map(sale => <label key={sale.id} style={{ display: 'block', padding: '8px 0', overflowWrap: 'anywhere' }}>
          <input type="checkbox" checked={selected.includes(sale.id)} aria-label={`Include ${sale.currency} ${sale.amount.toFixed(2)}`} onChange={event => { setSelected(current => event.target.checked ? [...current, sale.id] : current.filter(key => key !== sale.id)); resetPreview(); }} />{' '}
          <strong>{sale.currency} ${sale.amount.toFixed(2)}</strong><span className="helperText" style={{ display: 'block' }}>{sale.context}</span>
        </label>)}
        <button type="button" className="btn ghost" disabled={!selected.length} onClick={() => void calculate()}>Calculate Selected Prices</button>
      </div> : null}
      {preview ? <div style={{ marginTop: 12 }}>
        <p className="helperText">Suggested value: <strong>${preview.estimateCad.toFixed(2)} CAD</strong>. Median of {preview.sampleCount} selected {preview.sampleCount === 1 ? 'price' : 'prices'}; range ${preview.low.toFixed(2)}–${preview.high.toFixed(2)} CAD.</p>
        {rateNote ? <p className="helperText">{rateNote}</p> : null}
        <button type="button" className="btn primary" onClick={() => { try{onApply(preview.estimateCad,evidence(preview.estimateCad,amounts.filter(s=>selected.includes(s.id))));}catch(e:any){setMessage(e.message);return;} setMessage('Estimate applied. You can edit Estimated Value CAD before saving the card.'); }}>Apply Selected Estimate</button>
      </div> : null}
      <details style={{ marginTop: 16 }}><summary>Or enter confirmed CAD prices</summary>
        <p className="helperText">Enter one sold price per line, excluding shipping.</p>
        <label className="label" htmlFor={id}>Sold prices in CAD</label>
        <textarea id={id} className="input textarea" value={prices} onChange={(event) => { setPrices(event.target.value); setMessage(""); }} placeholder={"25.00\n30.00\n28.50"} />
        <button type="button" className="btn ghost" onClick={() => {
          try {
            const estimate = estimateSoldPrices(prices); onApply(estimate.estimateCad,validatePriceEvidence({...evidence(estimate.estimateCad,prices.trim().split(/\r?\n/).filter(v=>v.trim()).map(line=>({amount:estimateSoldPrices(line).estimateCad,currency:'CAD',context:line.trim().slice(0,350)}))),fxRate:undefined,fxDate:undefined})!);
            setMessage(`Applied median $${estimate.estimateCad.toFixed(2)} CAD from ${estimate.sampleCount} sold ${estimate.sampleCount === 1 ? "price" : "prices"} (range $${estimate.low.toFixed(2)}–$${estimate.high.toFixed(2)}). Save the card to keep this value.`);
          } catch (error: any) { setMessage(error.message); }
        }}>Apply Estimate</button>
      </details>
    </fieldset>
    {loading ? <p className="helperText" role="status">Getting the USD to CAD exchange rate…</p> : null}
    {message ? <p className="helperText" role="status">{message}</p> : null}
  </details>;
}
