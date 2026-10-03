"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import AuthGate from '@/components/AuthGate';
import { useAuth } from '@/components/AuthProvider';
import { loadBackupSections, restoreBackupSections } from '@/lib/full-backup';
import { loadCards, saveCard } from '@/lib/storage';
import { downloadCollectionBackup } from '@/lib/backup-photos';
import { MAX_BACKUP_BYTES, parseCollectionBackup, reviewRestore, type BackupReview, type RestoreEntry } from '@/lib/collection-backup';
import { MAX_IMAGE_BYTES } from '@/lib/images';
import type { CardRecord } from '@/lib/types';
type Activity = '' | 'download' | 'review' | 'restore';
export default function BackupPage() {
  const {user}=useAuth();
  const [cards,setCards]=useState<CardRecord[]>([]);
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const [photos,setPhotos]=useState(true),[activity,setActivity]=useState<Activity>(''),[status,setStatus]=useState(''),[error,setError]=useState('');
  const [backup,setBackup]=useState<BackupReview|null>(null),[review,setReview]=useState<RestoreEntry[]>([]),[filename,setFilename]=useState('');
  const owner=useRef(user?.id);owner.current=user?.id;
  const epoch=useRef(0),cancelled=useRef(false),controller=useRef<AbortController|null>(null);
  const reviewHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    let active=true;++epoch.current;cancelled.current=true;controller.current?.abort();
    setCards([]);setLoading(true);setLoadError('');setActivity('');setBackup(null);setReview([]);setFilename('');setError('');setStatus('');
    if(user)loadCards().then(next=>{if(active)setCards(next);}).catch(e=>{if(active)setLoadError(e.message||'Could not load the collection.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;epoch.current++;cancelled.current=true;controller.current?.abort();};
  },[user?.id]);
  const missing=review.filter(entry=>!entry.skip);
  const skipped=review.length-missing.length;
  const omitted=review.reduce((sum,entry)=>sum+entry.omittedPhotos,0);
  function start(next:Activity){cancelled.current=false;controller.current=new AbortController();setActivity(next);setError('');setStatus('');return {uid:owner.current!,run:++epoch.current,signal:controller.current.signal};}
  function current(uid:string,run:number){return uid===owner.current&&run===epoch.current;}
  async function download(){
    const {uid,run,signal}=start('download');
    try {
      const [latest,sections]=await Promise.all([loadCards(),loadBackupSections()]);if(!current(uid,run))return;setCards(latest);
      const blob=await downloadCollectionBackup(latest,uid,process.env.NEXT_PUBLIC_SUPABASE_URL!,photos,signal,(done,total)=>{if(current(uid,run))setStatus(`Preparing backup: ${done} of ${total} entries…`);},sections);
      if(!current(uid,run))return;
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`shadowfox-collection-backup-${new Date().toISOString().slice(0,10)}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setStatus(`Backup downloaded: ${latest.length} card entries, binders, checklists, want list and transactions${photos?' with available photos':' without photos'}. Keep the file somewhere safe.`);
    } catch(e:any){if(current(uid,run)){setStatus('');setError(signal.aborted?'Backup download cancelled.':e.message||'Could not download this backup.');}}
    finally{if(current(uid,run))setActivity('');}
  }
  async function preview(file:File){
    const {uid,run,signal}=start('review');setBackup(null);setReview([]);setFilename(file.name);
    try {
      if(file.size>MAX_BACKUP_BYTES)throw new Error('Choose a JSON file smaller than 50 MB.');
      const parsed=parseCollectionBackup(await file.text());signal.throwIfAborted();
      // Decode every embedded image before enabling any writes, so a damaged photo cannot cause a partial restore.
      for(let index=0;index<parsed.entries.length;index++) {
        signal.throwIfAborted();
        for(const data of [parsed.entries[index].card.frontImage,parsed.entries[index].card.backImage])if(data){
          const blob=await (await fetch(data,{signal})).blob();
          if(blob.size>MAX_IMAGE_BYTES)throw new Error(`Card ${index+1}: photo is too large.`);
          let image:ImageBitmap;
          try{image=await createImageBitmap(blob);}catch{throw new Error(`Card ${index+1}: a photo is damaged or unreadable.`);}
          try{if(!image.width||!image.height||image.width*image.height>50000000)throw new Error(`Card ${index+1}: photo dimensions are too large.`);}finally{image.close();}
        }
        if(current(uid,run))setStatus(`Checking backup: ${index+1} of ${parsed.entries.length} entries…`);
      }
      signal.throwIfAborted();const latest=await loadCards();const next=await reviewRestore(parsed.entries,latest,uid);signal.throwIfAborted();
      if(!current(uid,run))return;setCards(latest);setBackup(parsed);setReview(next);setStatus('Backup checked. Review the cards below before restoring.');
      requestAnimationFrame(()=>reviewHeading.current?.focus());
    }catch(e:any){if(current(uid,run)){setStatus('');setError(signal.aborted?'Backup review cancelled.':e.message||'Could not read this backup.');}}
    finally{if(current(uid,run))setActivity('');}
  }
  async function restore(){
    if(!backup)return;const {uid,run}=start('restore');let added=0,kept=0;
    try{
      const latest=await loadCards();const plan=await reviewRestore(backup.entries,latest,uid);
      for(let index=0;index<plan.length;index++) {
        if(!current(uid,run))return;if(cancelled.current)break;
        const entry=plan[index];if(entry.skip){kept++;continue;}
        setStatus(`Restoring entry ${index+1} of ${plan.length} · ${added} added…`);
        try {await saveCard({...entry.card,id:entry.restoreId},{expectedUserId:uid,insertOnly:true});added++;}
        catch(saveError){
          // A connection failure can hide a committed insert. Stable IDs make a retry safe.
          const persisted=await loadCards();if(!persisted.some(card=>card.id===entry.restoreId))throw saveError;added++;
        }
      }
      const refreshed=await loadCards();const records=cancelled.current?0:await restoreBackupSections(backup,refreshed,uid,()=>cancelled.current||!current(uid,run));const next=await reviewRestore(backup.entries,refreshed,uid);
      if(!current(uid,run))return;setCards(refreshed);setReview(next);
      setStatus(`${cancelled.current?'Stopped after the current card.':'Restore complete.'} ${added} entries added; ${kept} matching card entries kept unchanged; ${records} collection records added.${cancelled.current?' Review the remaining entries and resume when ready.':''}`);
    }catch(e:any){if(current(uid,run)){setError(`Restore stopped: ${e.message||'Could not save this card.'} ${added} entries were added. Recheck the file to safely resume; already restored entries will be skipped.`);setStatus('');}}
    finally{if(current(uid,run))setActivity('');}
  }
  return <AuthGate><PageShell title="Collection backup">
    <p className="vaultWelcomeCopy">Download your cards, binders, set checklists, want list and purchases/sales. Include photos for a portable copy you can restore later.</p>
    <div className="buttonRow organizeNav"><Link className="btn ghost" href="/collection">Back to collection</Link><Link className="btn ghost" href="/account">Account settings</Link></div>
    <p className="helperText">Complete backups include binder membership and transaction links to cards. Account credentials and profile settings are excluded. Existing records remain unchanged when you restore.</p>
    {loadError?<p className="workflowNotice" role="alert">{loadError} Refresh to try again.</p>:null}
    {error?<p className="workflowNotice" role="alert">{error}</p>:null}
    {status?<p className="workflowNotice" role="status">{status}</p>:null}
    <div className="backupPanels">
      <section className="panel"><span className="vaultEyebrow">A copy of your collection</span><h2>Download backup</h2><p className="helperText">{loading?'Loading your collection…':`${cards.length} saved entries. This includes the entire collection, regardless of your filters.`}</p><label className="checkRow"><input type="checkbox" checked={photos} disabled={!!activity} onChange={e=>setPhotos(e.target.checked)}/><span>Include card photos</span></label><p className="helperText">Files can contain up to 2,000 entries and 50 MB. Photos take longer and make a larger file. Keep an extra copy of the downloaded file.</p><button className="btn primary" disabled={loading||!!loadError||!!activity} onClick={()=>void download()}>{activity==='download'?'Preparing backup…':'Download collection backup'}</button></section>
      <section className="panel"><span className="vaultEyebrow">Bring your cards back</span><h2>Restore from file</h2><p className="helperText">Choose a ShadowFox backup or an earlier JSON collection export. The file is checked before anything is saved. Existing cards and quantities stay unchanged.</p><label className="label" htmlFor="collection-backup-file">Collection backup file</label><input className="input" id="collection-backup-file" type="file" accept=".json,application/json" disabled={loading||!!loadError||!!activity} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file&&!loading&&!activity)void preview(file);}}/><p className="helperText">Older exports with photo links restore card details only. Use a new backup with photos to recover the images.</p></section>
    </div>
    {activity?<div className="buttonRow"><button className="btn ghost" onClick={()=>{cancelled.current=true;if(activity!=='restore')controller.current?.abort();else setStatus('Stopping after the current card finishes…');}}>{activity==='restore'?'Stop after current card':'Cancel'}</button></div>:null}
    {backup?<section className="panel backupReview"><h2 ref={reviewHeading} tabIndex={-1}>Review your backup</h2><p className="helperText backupFilename">{filename}{backup.exportedAt?` · Saved ${new Date(backup.exportedAt).toLocaleString()}`:''}</p>{backup.sections?<p className="helperText">Also included: {backup.sections.binders.length} binders, {backup.sections.memberships.length} binder memberships, {backup.sections.checklists.length} checklists, {backup.sections.wants.length} wanted cards and {backup.sections.transactions.length} purchase/sale records. Missing collection records will be added; repeated restores skip previously imported records.</p>:<p className="helperText">This older file contains card records only.</p>}<div className="backupCounts"><strong>{missing.length} to add</strong><span>{skipped} matching entries will be skipped</span></div><p className="helperText">New entries retain their saved quantities. Matching cards keep their current details, quantities and photos. New records and photos belong to your signed-in account.</p>{omitted?<p className="workflowNotice">{omitted} linked photos are not embedded in this file and cannot be recovered from it.</p>:null}
      <ul className="backupCardList">{review.slice(0,30).map(entry=><li key={entry.restoreId}><div><strong>{entry.card.player||"Untitled card"}</strong><span>{[entry.card.year,entry.card.brand,entry.card.set,entry.card.cardNumber&&`#${entry.card.cardNumber}`,entry.card.parallel,entry.card.serialNumber].filter(Boolean).join(' · ')}</span></div><span>Qty {entry.card.quantity} · {entry.skip?'Keep existing':'Add'}</span></li>)}</ul>{review.length>30?<p className="helperText">Showing the first 30 of {review.length} entries. All entries have been checked.</p>:null}<button className="btn primary" disabled={!!activity||(!missing.length&&!backup.sections)} onClick={()=>void restore()}>{activity==='restore'?'Restoring…':backup.sections?'Restore complete backup':missing.length?`Restore ${missing.length} missing ${missing.length===1?'entry':'entries'}`:'All entries already in your collection'}</button>
    </section>:null}
  </PageShell></AuthGate>;
}
