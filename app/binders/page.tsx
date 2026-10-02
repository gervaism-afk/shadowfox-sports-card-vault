"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";
import PageShell from "@/components/PageShell";
import CollectionGrid from "@/components/CollectionGrid";
import CollectionPdfExport from "@/components/CollectionPdfExport";
import { loadCards } from "@/lib/storage";
import { loadBinders, saveBinder, deleteBinder, setBinderCard, type Binder, type BinderCard } from "@/lib/organize";
import type { CardRecord } from "@/lib/types";
export default function BindersPage() {
  const {user}=useAuth();const userRef=useRef(user?.id);userRef.current=user?.id;
  const [binders,setBinders]=useState<Binder[]>([]);const [memberships,setMemberships]=useState<BinderCard[]>([]);const [cards,setCards]=useState<CardRecord[]>([]);
  const [selected,setSelected]=useState("");const [name,setName]=useState("");const [rename,setRename]=useState("");const [search,setSearch]=useState("");const [editing,setEditing]=useState(false);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [status,setStatus]=useState("");
  async function refresh() {
    const uid=userRef.current;
    const [data,next]=await Promise.all([loadBinders(),loadCards()]);
    if(uid!==userRef.current)return;
    setBinders(data.binders);setMemberships(data.memberships);setCards(next);
    setSelected(previous=>data.binders.some(b=>b.id===previous)?previous:data.binders[0]?.id||"");
  }
  useEffect(()=>{let active=true;setLoading(true);setBinders([]);setCards([]);setMemberships([]);setStatus("");if(user)Promise.all([loadBinders(),loadCards()]).then(([data,next])=>{if(active){setBinders(data.binders);setMemberships(data.memberships);setCards(next);setSelected(data.binders[0]?.id||"");}}).catch(e=>{if(active)setStatus(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[user?.id]);
  async function action(run:()=>Promise<unknown>) {if(busy)return;setBusy(true);setStatus("");try{await run();await refresh();}catch(e:any){setStatus(e.message||"Could not update this binder.");}finally{setBusy(false);}}
  function toggleCard(cardId:string,add:boolean) {
    if(busy)return;
    const previous=memberships;const uid=userRef.current;
    setMemberships(current=>add?[...current,{binder_id:selected,card_id:cardId}]:current.filter(m=>!(m.binder_id===selected&&m.card_id===cardId)));
    void action(async()=>{try{await setBinderCard(selected,cardId,add);}catch(error){if(userRef.current===uid)setMemberships(previous);throw error;}});
  }
  const binder=binders.find(b=>b.id===selected);const ids=new Set(memberships.filter(m=>m.binder_id===selected).map(m=>m.card_id));const included=cards.filter(c=>ids.has(c.id));
  const matches=cards.filter(c=>[c.player,c.year,c.brand,c.set,c.cardNumber,c.parallel].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <AuthGate><PageShell title="Your binders">
    <p className="vaultWelcomeCopy">Make a home for favorite sets, teams or cards for sale. A card can belong to more than one binder.</p>
    <div className="buttonRow organizeNav"><Link className="btn ghost" href="/collection">All cards</Link><Link className="btn ghost" href="/want-list">Want list</Link></div>
    <section className="panel"><form className="organizeCreate" onSubmit={e=>{e.preventDefault();void action(async()=>{const created=await saveBinder(name);setName("");setSelected(created.id);});}}><label className="label" htmlFor="binder-name">New binder name</label><input className="input" id="binder-name" maxLength={80} required placeholder="e.g. Canadiens or Cards for sale" value={name} onChange={e=>setName(e.target.value)} disabled={busy||loading}/><button className="btn primary" disabled={busy||loading}>Create binder</button></form></section>
    {status?<p className="workflowNotice" role="status">{status}</p>:null}
    {loading?<p role="status">Loading your binders…</p>:binders.length?<>
      <section className="panel"><label className="label" htmlFor="selected-binder">Choose binder</label><select className="input" id="selected-binder" value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setEditing(false);setSearch("");}}>{binders.map(b=><option key={b.id} value={b.id}>{b.name} ({memberships.filter(m=>m.binder_id===b.id).length})</option>)}</select>
        <div className="buttonRow" style={{marginTop:16}}><button className="btn ghost" disabled={busy} onClick={()=>{setRename(binder?.name||"");setEditing(!editing);}}>Rename binder</button><button className="btn ghost" disabled={busy} onClick={()=>{if(window.confirm("Delete this binder? Your cards will stay in your collection."))void action(()=>deleteBinder(selected));}}>Delete binder</button><CollectionPdfExport cards={included} filtered={included} disabled={busy} title={binder?.name} /></div>
        {editing?<form className="organizeCreate" onSubmit={e=>{e.preventDefault();void action(async()=>{await saveBinder(rename,selected);setEditing(false);});}}><label className="label" htmlFor="rename-binder">Binder name</label><input className="input" id="rename-binder" required maxLength={80} value={rename} onChange={e=>setRename(e.target.value)} disabled={busy}/><button className="btn primary" disabled={busy}>Save binder name</button></form>:null}
      </section>
      <details className="panel binderPicker"><summary>Add or remove cards</summary><label className="label" htmlFor="binder-search">Find a saved card</label><input className="input" type="search" id="binder-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Player, year, brand or variation"/><p className="helperText">Check cards to add them. Uncheck to remove them from this binder only.</p><div className="binderPickerRows">{matches.slice(0,80).map(card=><label className="checkRow" key={card.id}><input type="checkbox" aria-label={`Include ${card.player} ${card.year} #${card.cardNumber}`} checked={ids.has(card.id)} disabled={busy} onChange={e=>toggleCard(card.id,e.target.checked)}/><span><strong>{card.player}</strong><small>{[card.year,card.brand,card.set,card.cardNumber&&`#${card.cardNumber}`,card.parallel].filter(Boolean).join(" · ")}</small></span></label>)}</div>{matches.length>80?<p className="helperText">Showing the first 80 matches. Search to find a specific card.</p>:null}{!matches.length?<p className="helperText">No matching saved cards. Add cards to your collection first.</p>:null}</details>
      <div className="vaultSectionHeading"><h2>{binder?.name}</h2><span className="helperText">{included.length} entries</span></div>{included.length?<CollectionGrid cards={included}/>:<section className="vaultEmptyState"><h2>This binder is ready for cards.</h2><p>Open “Add or remove cards” above to choose from your collection.</p></section>}
    </>:<section className="vaultEmptyState"><h2>Start your first binder.</h2><p>Create a binder above, then choose cards from your collection.</p></section>}
  </PageShell></AuthGate>;
}
