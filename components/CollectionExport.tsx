"use client";
import { useState } from 'react';
import VaultIcon from './VaultIcon';
import CollectionPdfExport from './CollectionPdfExport';
import { cardsCsv } from '@/lib/collection-export';
import type { CardRecord } from '@/lib/types';
export default function CollectionExport({cards,filtered,disabled,description}:{cards:CardRecord[];filtered:CardRecord[];disabled:boolean;description:string}) {
  const [scope,setScope]=useState<'all'|'filtered'>('filtered');
  const selected=scope==='all'?cards:filtered;
  function download(format:'csv'|'json') {
    const blob=format==='csv'?new Blob(['\ufeff',cardsCsv(selected)],{type:'text/csv;charset=utf-8'}):new Blob([JSON.stringify(selected,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`shadowfox-${scope==='filtered'&&description?'filtered-':''}vault-export.${format}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <details className="vaultExport"><summary onClick={()=>setScope('filtered')}><VaultIcon name="arrow" size={16}/>Print &amp; export</summary><div className="collectionExportOptions">
    <label className="label" htmlFor="collection-export-scope">Export scope</label><select className="input" id="collection-export-scope" value={scope} onChange={e=>setScope(e.target.value as 'all'|'filtered')} disabled={disabled}><option value="filtered">{description?'Matching cards':'Current results'} ({filtered.length} entries)</option><option value="all">Entire collection ({cards.length} entries)</option></select>
    <p className="helperText">{selected.length} entries will be included.{scope==='filtered'&&description?` ${description}`:''}</p>
    <CollectionPdfExport cards={cards} filtered={filtered} disabled={disabled} preferredScope={scope} filterDescription={description}/>
    <button className="btn ghost" type="button" onClick={()=>download('csv')} disabled={disabled||!selected.length}>Export CSV</button><button className="btn ghost" type="button" onClick={()=>download('json')} disabled={disabled||!selected.length}>Export JSON</button>
  </div></details>;
}
