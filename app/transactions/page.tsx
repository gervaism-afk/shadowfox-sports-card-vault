"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";
import PageShell from "@/components/PageShell";
import { loadCards } from "@/lib/storage";
import { loadTransactions, saveTransaction, deleteTransaction } from "@/lib/transactions";
import { cadCents, money, transactionNet, transactionProfit, transactionTotals, transactionCsv, type Transaction } from "@/lib/transaction-math";
import type { CardRecord } from "@/lib/types";
const fresh = () => ({ card_id: "", card_label: "", kind: "purchase" as "purchase"|"sale", occurred_on: new Date().toLocaleDateString("en-CA"), quantity: "1", amount: "", fees: "0", cost: "", notes: "" });
type Draft = ReturnType<typeof fresh>;
function cardLabel(card: CardRecord) { return [card.player,card.year,card.brand,card.set,card.subset,card.cardNumber&&`#${card.cardNumber}`,card.parallel,card.serialNumber,[card.gradingCompany,card.grade].filter(Boolean).join(" ")].filter(Boolean).join(" · "); }
export default function TransactionsPage() {
  const {user}=useAuth();
  const [rows,setRows]=useState<Transaction[]>([]), [cards,setCards]=useState<CardRecord[]>([]);
  const [loading,setLoading]=useState(true), [busy,setBusy]=useState(false), [status,setStatus]=useState("");
  const [draft,setDraft]=useState<Draft>(fresh), [editing,setEditing]=useState<string>(), [showForm,setShowForm]=useState(false);
  const [search,setSearch]=useState(""), [filter,setFilter]=useState("all");
  const owner=useRef(user?.id); owner.current=user?.id;
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    let active=true; setRows([]);setCards([]);setLoading(true);setShowForm(false);setEditing(undefined);setDraft(fresh());setStatus("");
    if(user) Promise.all([loadTransactions(),loadCards()]).then(([next,owned])=>{
      if(!active)return; setRows(next);setCards(owned);
      const card=owned.find(c=>c.id===new URLSearchParams(window.location.search).get("card"));
      if(card){setDraft({...fresh(),card_id:card.id,card_label:cardLabel(card)});setShowForm(true);}
    }).catch(e=>{if(active)setStatus(e.message||"Could not load transactions.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[user?.id]);
  useEffect(()=>{if(showForm)heading.current?.focus();},[showForm,editing]);
  async function action(run:()=>Promise<void>,message:string) {
    if(busy)return;const uid=owner.current;setBusy(true);setStatus("");
    try {await run();const next=await loadTransactions();if(uid!==owner.current)return;setRows(next);setStatus(message);setShowForm(false);setEditing(undefined);setDraft(fresh());}
    catch(e:any){if(uid===owner.current)setStatus(e.message||"Could not save this transaction.");}
    finally{setBusy(false);}
  }
  function edit(row:Transaction){setEditing(row.id);setDraft({card_id:row.card_id||"",card_label:row.card_label,kind:row.kind,occurred_on:row.occurred_on,quantity:String(row.quantity),amount:(row.amount_cents/100).toFixed(2),fees:(row.fees_cents/100).toFixed(2),cost:row.cost_cents===null?"":(row.cost_cents/100).toFixed(2),notes:row.notes});setShowForm(true);}
  const filtered=rows.filter(row=>(filter==="all"||row.kind===filter)&&[row.card_label,row.notes,row.occurred_on].join(" ").toLowerCase().includes(search.toLowerCase()));
  const totals=transactionTotals(filtered);
  let preview:Transaction|null=null;
  try{preview={id:"",card_id:draft.card_id||null,card_label:draft.card_label,kind:draft.kind,occurred_on:draft.occurred_on,quantity:Number(draft.quantity),amount_cents:cadCents(draft.amount),fees_cents:cadCents(draft.fees),cost_cents:draft.cost.trim()?cadCents(draft.cost):null,notes:draft.notes};}catch{}
  function patch(key:keyof Draft,value:string){setDraft(previous=>({...previous,[key]:value}));}
  function exportCsv(){const url=URL.createObjectURL(new Blob(["\ufeff",transactionCsv(filtered)],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="shadowfox-purchases-sales.csv";a.click();URL.revokeObjectURL(url);}
  return <AuthGate><PageShell title="Purchases & sales">
    <p className="vaultWelcomeCopy">Track what you paid and what you earned. All amounts are in CAD and cover the entire transaction. These records are separate from your card estimates and do not change collection quantities.</p>
    <div className="buttonRow organizeNav"><Link className="btn ghost" href="/collection">Collection</Link><Link className="btn ghost" href="/analytics">Insights</Link><button className="btn primary" disabled={busy||loading} onClick={()=>{setEditing(undefined);setDraft(fresh());setShowForm(true);}}>Record transaction</button><button className="btn ghost" disabled={loading||!filtered.length} onClick={exportCsv}>Export CSV</button></div>
    {status?<p className="workflowNotice" role="status">{status}</p>:null}
    <div className="transactionStats"><div className="metaCard"><span className="kpiLabel">Purchase spend · CAD</span><strong>{money(totals.spent)}</strong><span className="helperText">Includes purchase costs</span></div><div className="metaCard"><span className="kpiLabel">Net sale proceeds · CAD</span><strong>{money(totals.proceeds)}</strong><span className="helperText">After selling costs</span></div><div className="metaCard"><span className="kpiLabel">Recorded profit · CAD</span><strong>{totals.knownSales?money(totals.profit):"Not yet known"}</strong><span className="helperText">{totals.knownSales} sales with known costs{totals.unknownCosts?` · ${totals.unknownCosts} awaiting costs`:""}</span></div></div>
    {showForm?<section className="panel transactionEditor"><h2 ref={heading} tabIndex={-1}>{editing?"Edit transaction":"Record a transaction"}</h2><form onSubmit={e=>{e.preventDefault();void action(async()=>{await saveTransaction({card_id:draft.card_id||null,card_label:draft.card_label,kind:draft.kind,occurred_on:draft.occurred_on,quantity:Number(draft.quantity),amount_cents:cadCents(draft.amount),fees_cents:cadCents(draft.fees),cost_cents:draft.kind==="sale"&&draft.cost.trim()?cadCents(draft.cost):null,notes:draft.notes},editing);},"Transaction saved. Collection quantities are unchanged.");}}><fieldset disabled={busy} className="transactionFieldset">
      <div className="transactionFields">
        <label className="label">Type<select aria-label="Type" className="input" value={draft.kind} onChange={e=>patch("kind",e.target.value)}><option value="purchase">Purchase</option><option value="sale">Sale</option></select></label>
        <label className="label">Date<input className="input" type="date" required value={draft.occurred_on} onChange={e=>patch("occurred_on",e.target.value)}/></label>
        <label className="label transactionWide">Link to a collection card (optional)<select aria-label="Link to a collection card (optional)" className="input" value={draft.card_id} onChange={e=>{const card=cards.find(c=>c.id===e.target.value);setDraft(previous=>({...previous,card_id:e.target.value,card_label:card?cardLabel(card):previous.card_label}));}}><option value="">No collection link</option>{cards.map(card=><option key={card.id} value={card.id}>{cardLabel(card)}</option>)}</select></label>
        <label className="label transactionWide">Card description<input className="input" required maxLength={1000} value={draft.card_label} onChange={e=>patch("card_label",e.target.value)} placeholder="Player, year, brand, set, number and variation"/></label>
        <label className="label">Transaction quantity<input className="input" type="number" min={1} max={100000} step={1} required value={draft.quantity} onChange={e=>patch("quantity",e.target.value)}/></label>
        <label className="label">{draft.kind==="purchase"?"Total purchase price (CAD)":"Total sale price (CAD)"}<input className="input" inputMode="decimal" required value={draft.amount} onChange={e=>patch("amount",e.target.value)} placeholder="0.00"/></label>
        <label className="label">{draft.kind==="purchase"?"Extra purchase costs (CAD)":"Selling fees & shipping paid (CAD)"}<input className="input" inputMode="decimal" required value={draft.fees} onChange={e=>patch("fees",e.target.value)}/></label>
        {draft.kind==="sale"?<label className="label">Cost of all cards sold (CAD)<input aria-label="Cost of all cards sold (CAD)" className="input" inputMode="decimal" value={draft.cost} onChange={e=>patch("cost",e.target.value)} placeholder="Leave blank if unknown"/><span className="helperText">Include what you paid and acquisition costs for this quantity.</span></label>:null}
        <label className="label transactionWide">Notes<textarea className="input" maxLength={4000} value={draft.notes} onChange={e=>patch("notes",e.target.value)} placeholder="Seller, order number, platform or other details"/></label>
      </div>
      <p className="helperText">{draft.kind==="sale"?"Include shipping collected in the sale price. Enter fees and shipping you paid as selling costs. Profit is calculated only when you enter the cost of the cards sold.":"Enter the price for all cards in this purchase. Extra costs can include shipping and taxes."}</p>
      {preview?<p className="workflowNotice">{draft.kind==="purchase"?"Total paid":"Net sale proceeds"}: {money(transactionNet(preview))}{draft.kind==="sale"?` · Profit: ${transactionProfit(preview)===null?"cost not entered":money(transactionProfit(preview)!)}`:""}</p>:null}
      <div className="buttonRow"><button className="btn primary">{busy?"Saving…":"Save transaction"}</button><button className="btn ghost" type="button" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </fieldset></form></section>:null}
    <section className="panel transactionFields"><label className="label">Search transactions<input className="input" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Card, date or notes"/></label><label className="label">Show<select aria-label="Show" className="input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All transactions</option><option value="purchase">Purchases</option><option value="sale">Sales</option></select></label><p className="helperText transactionWide">{filtered.length} records · Totals and CSV reflect these filters.</p></section>
    {loading?<p role="status">Loading transactions…</p>:!filtered.length?<section className="vaultEmptyState"><h2>{rows.length?"No matching transactions.":"Your collection has a story."}</h2><p>{rows.length?"Try a different search or filter.":"Record your first purchase or sale to start tracking your spending and profit."}</p></section>:<div className="wantListRows">{filtered.map(row=><section className="panel transactionRow" key={row.id}><span className="vaultEyebrow">{row.kind} · {row.occurred_on} · Qty {row.quantity}</span><h2>{row.card_label}</h2><dl className="transactionAmounts"><div><dt>{row.kind==="purchase"?"Purchase price":"Sale price"}</dt><dd>{money(row.amount_cents)}</dd></div><div><dt>{row.kind==="purchase"?"Extra costs":"Selling costs"}</dt><dd>{money(row.fees_cents)}</dd></div><div><dt>{row.kind==="purchase"?"Total paid":"Net proceeds"}</dt><dd>{money(transactionNet(row))}</dd></div>{row.kind==="sale"?<><div><dt>Cost of cards sold</dt><dd>{row.cost_cents===null?"Unknown":money(row.cost_cents)}</dd></div><div><dt>Profit</dt><dd>{transactionProfit(row)===null?"Cost not entered":money(transactionProfit(row)!)}</dd></div></>:null}</dl>{row.notes?<p className="helperText">{row.notes}</p>:null}<div className="buttonRow">{row.card_id?<Link className="btn ghost" href={`/card/${row.card_id}`}>View card</Link>:null}<button className="btn ghost" disabled={busy} onClick={()=>edit(row)}>Edit transaction</button><button className="btn ghost" disabled={busy} onClick={()=>{if(window.confirm("Delete this financial record? Your collection will stay unchanged."))void action(()=>deleteTransaction(row.id),"Transaction deleted.");}}>Delete transaction</button></div></section>)}</div>}
  </PageShell></AuthGate>;
}
