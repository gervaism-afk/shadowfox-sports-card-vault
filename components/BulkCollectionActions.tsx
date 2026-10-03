"use client";
import { useEffect, useId, useState } from 'react';
import type { CardRecord } from '@/lib/types';
import { bulkFields, bulkPreview, type BulkChanges, type BulkField } from '@/lib/bulk-edit';
import { bulkUpdateCards } from '@/lib/bulk-storage';
import { loadBinders, type Binder } from '@/lib/organize';

export default function BulkCollectionActions({cards,scopeKey,onSaved}:{cards:CardRecord[];scopeKey:string;onSaved:()=>Promise<void>}) {
 const id=useId();
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<string[]>([]),[changes,setChanges]=useState<BulkChanges>({});
 const [binders,setBinders]=useState<Binder[]>([]),[binder,setBinder]=useState(''),[busy,setBusy]=useState(false),[review,setReview]=useState(false),[message,setMessage]=useState('');
 const [binderError,setBinderError]=useState(''),[binderLoading,setBinderLoading]=useState(false);
 useEffect(()=>{setSelected([]);setReview(false);setMessage('');},[scopeKey]);
 useEffect(()=>{if(!open)return;let active=true;setBinderLoading(true);setBinderError('');loadBinders().then(result=>{if(active)setBinders(result.binders);}).catch(e=>{if(active)setBinderError(e.message||'Could not load binders.');}).finally(()=>{if(active)setBinderLoading(false);});return()=>{active=false;};},[open]);
 const selectedCards=cards.filter(card=>selected.includes(card.id));
 const visible=cards.slice(0,500);
 function updateField(key:BulkField,value:string) {setChanges(previous=>({...previous,[key]:value}));setReview(false);setMessage('');}
 async function apply() {
  if(busy)return;setBusy(true);setMessage('');
  try {
   const count=await bulkUpdateCards(selectedCards.map(card=>card.id),changes,binder);
   // Report a successful mutation even if the following refresh loses connectivity.
   setReview(false);setSelected([]);setChanges({});setBinder('');
   setMessage(`Updated ${count} selected ${count===1?'card':'cards'}${binder?' and added them to the binder':''}.`);
   try{await onSaved();}catch{setMessage(`Saved ${count} selected cards. Refresh the collection to see the latest details.`);}
  }catch(e:any){setMessage(e.message||'Could not update the selected cards.');}finally{setBusy(false);}
 }
 return <section className="bulkCollection">
  <button type="button" className="btn ghost" disabled={busy} aria-expanded={open} onClick={()=>{setOpen(!open);setReview(false);setSelected([]);setMessage('');}}>Bulk edit / add to binder</button>
  {open?<div className="panel bulkPanel">
   <h2>Work with several cards</h2><p className="helperText">Select from the cards matching your collection filters. Choose only the fields you want to change, or add the selection to a binder.</p>
   <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}>
    <div className="buttonRow"><button type="button" className="btn ghost" disabled={!visible.length} onClick={()=>{setSelected(visible.map(card=>card.id));setReview(false);}}>Select matching cards{cards.length>500?' (first 500)':''}</button><button type="button" className="btn ghost" disabled={!selected.length} onClick={()=>{setSelected([]);setReview(false);}}>Clear selection</button><span className="helperText">{selectedCards.length} selected</span></div>
    {cards.length>500?<p className="helperText">Up to 500 entries per update. Narrow your filters to work with another group.</p>:null}
    <div className="bulkCardSelection" aria-label="Cards for bulk editing">{visible.map(card=><label className="bulkCardChoice" key={card.id}><input type="checkbox" checked={selected.includes(card.id)} aria-label={`Select ${card.player} ${card.year} ${card.set} #${card.cardNumber}${card.parallel?' '+card.parallel:''}`} onChange={event=>{setSelected(ids=>event.target.checked?[...ids,card.id]:ids.filter(value=>value!==card.id));setReview(false);}}/><span><strong>{card.player}</strong><small>{[card.year,card.brand,card.set,card.subset,card.cardNumber?'#'+card.cardNumber:'',card.parallel].filter(Boolean).join(' · ')}</small></span></label>)}</div>
    <h3>Shared details</h3><p className="helperText">Checked fields replace the value on every selected card. An empty checked field clears that value. The player name cannot be empty.</p>
    <div className="formGrid">{bulkFields.map(field=><div className="fieldBlock" key={field.key}><label className="checkRow" htmlFor={`${id}-enable-${field.key}`}><input id={`${id}-enable-${field.key}`} type="checkbox" checked={field.key in changes} onChange={e=>{setChanges(previous=>{const next={...previous};if(e.target.checked)next[field.key]='';else delete next[field.key];return next;});setReview(false);}}/><span>Change {field.label.toLowerCase()}</span></label><label className="label" htmlFor={`${id}-${field.key}`}>{field.label}</label><input id={`${id}-${field.key}`} className="input" maxLength={250} disabled={!(field.key in changes)} value={changes[field.key]||''} onChange={e=>updateField(field.key,e.target.value)} placeholder="New shared value"/></div>)}</div>
    <label className="label" htmlFor={`${id}-binder`}>Add selected cards to binder (optional)</label><select id={`${id}-binder`} className="input" value={binder} disabled={binderLoading} onChange={e=>{setBinder(e.target.value);setReview(false);}}><option value="">{binderLoading?'Loading binders…':'No binder assignment'}</option>{binders.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select>
    {binderError?<p className="helperText" role="alert">{binderError}</p>:!binderLoading&&!binders.length?<p className="helperText">Create a binder from the Binders page to use this option.</p>:null}
    {review?<div className="softPanel bulkReview" role="region" aria-label="Review bulk changes"><h3>Review your update</h3><p>{selectedCards.length} selected entries · {bulkPreview(selectedCards,changes)} with changed details</p><ul>{bulkFields.filter(field=>field.key in changes).map(field=><li key={field.key}>{field.label}: <strong>{changes[field.key]?.trim()||'(clear this field)'}</strong></li>)}{binder?<li>Add to binder: <strong>{binders.find(row=>row.id===binder)?.name}</strong></li>:null}</ul>{bulkPreview(selectedCards,changes)>0?<p className="helperText">Changing a card’s identity clears supporting pricing details for its previous match. Photos, quantities and saved estimate amounts stay with each card.</p>:null}<button type="button" className="btn primary" onClick={()=>void apply()}>Apply to {selectedCards.length} selected cards</button></div>:<button type="button" className="btn primary" style={{marginTop:16}} disabled={!selectedCards.length||(!Object.keys(changes).length&&!binder)} onClick={()=>{try{bulkPreview(selectedCards,changes);setReview(true);setMessage('');}catch(e:any){setMessage(e.message);}}}>Review bulk changes</button>}
   </fieldset>
   {busy?<p className="helperText" role="status">Saving selected cards…</p>:message?<p className="helperText" role="status">{message}</p>:null}
  </div>:null}
 </section>;
}
