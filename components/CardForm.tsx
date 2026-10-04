"use client";
import ReferencePhotos from "./ReferencePhotos";

import { identityFields, type ReviewField } from '@/lib/ai-identification';
import { manualPriceEvidence } from '@/lib/price-evidence';
import { useId } from "react";
import { CardRecord, GradingCompany, Sport } from "@/lib/types";
import CardSuggestionInput, { type CardSuggestion } from "@/components/CardSuggestionInput";
import { useCardCatalog, useOwnedCardSuggestions } from "@/lib/catalog/client";
import { matchesCatalogYear, normalizeOption, optionValues } from "@/lib/catalog/types";
import { commonVariants } from '@/lib/catalog/variants';
import ImagePicker from "@/components/ImagePicker";

const gradingOptions: GradingCompany[] = ["", "PSA", "BGS", "SGC", "CGC", "Other"];
const sportOptions: Sport[] = ["Hockey", "Baseball"];

export default function CardForm({ value, onChange, showImageFields = true, collapsibleExtras = false, wanted = false, reviewFields = [], onReview }: { value: CardRecord; onChange: (card: CardRecord) => void; showImageFields?: boolean; collapsibleExtras?: boolean; wanted?: boolean; reviewFields?: ReviewField[]; onReview?: (field: ReviewField["field"]) => void; }) {
  const id = useId();
  const needsReview = (key:string) => reviewFields.some(row=>row.field===key);
  const setField = <K extends keyof CardRecord>(key: K, next: CardRecord[K]) => onChange({ ...value, [key]: next, ...(key === "estimatedValueCad" ? {priceEvidence:manualPriceEvidence(Number(next))}: (identityFields as readonly string[]).includes(key) && next !== value[key] ? {priceEvidence:null}: {}) });

  const changeIdentity = (next:CardRecord) => onChange({...next,priceEvidence:identityFields.some(key=>next[key]!==value[key])?null:next.priceEvidence});
  const { catalog, loading: catalogLoading, error: catalogError } = useCardCatalog(value.sport,value.year);
  const owned=useOwnedCardSuggestions().filter(card=>card.sport===value.sport);
  const currentYear=new Date().getUTCFullYear();
  const years=optionValues([...(catalog?.sets.map(row=>row.year)||[]),...owned.map(card=>card.year),...Array.from({length:currentYear-1899},(_,i)=>value.sport==='Hockey'?`${currentYear-i}-${String(currentYear-i+1).slice(-2)}`:String(currentYear-i))]).reverse();
  const products=(catalog?.sets||[]).filter(row=>(!value.brand||normalizeOption(row.brand)===normalizeOption(value.brand))&&matchesCatalogYear(row.year,value.year,value.sport));
  const fallbackBrands=value.sport==='Hockey'?['Upper Deck','O-Pee-Chee','Panini','Topps','Score','Fleer','Pacific']:['Topps','Bowman','Panini','Donruss','Upper Deck','Fleer','Leaf','Score','Pinnacle','Pacific'];
  const plain=(items:string[]):CardSuggestion[]=>optionValues(items).map(text=>({value:text}));
  const common=commonVariants(value.sport,value.brand,value.set);
  const variantOptions=(key: "subset"|"parallel")=>{const saved=plain(owned.filter(card=>normalizeOption(card.brand)===normalizeOption(value.brand)&&normalizeOption(card.year)===normalizeOption(value.year)&&normalizeOption(card.set)===normalizeOption(value.set)).map(card=>card[key]));return [...saved.map(option=>({...option,detail:"From your saved cards"})),...common[key].filter(text=>!saved.some(option=>normalizeOption(option.value)===normalizeOption(text))).map(text=>({value:text,detail:"Common term · verify on your card"}))];};
  const options:Record<string,CardSuggestion[]>={
    player:plain([...owned.map(card=>card.player),...(catalog?.players.map(player=>player.name)||[])]),
    team:plain([...owned.map(card=>card.team),...(catalog?.teams||[])]),
    year:years.map(year=>({value:year})),
    brand:plain([...fallbackBrands,...owned.map(card=>card.brand),...(catalog?.sets.map(row=>row.brand)||[])]),
    set:[...products.map(row=>({value:row.set,detail:[row.year,row.brand].filter(Boolean).join(' · '),key:row.url})),...plain([...owned.filter(card=>(!value.brand||normalizeOption(card.brand)===normalizeOption(value.brand))&&matchesCatalogYear(card.year,value.year,value.sport)).map(card=>card.set)]).filter(option=>!products.some(row=>normalizeOption(row.set)===normalizeOption(option.value)))],
    subset:variantOptions("subset"),
    parallel:variantOptions("parallel"),
  };
  function suggestion(key:'player'|'team'|'year'|'brand'|'set'|'subset'|'parallel',label:string){return <div className={needsReview(key)?"scanReviewField":""}><CardSuggestionInput id={`${id}-${key}`} label={label} value={value[key]} options={options[key]} onChange={next=>setField(key,next)} onSelect={key==='set'?option=>{const product=products.find(row=>row.url===option.key);changeIdentity({...value,set:option.value,...(product&&!value.brand?{brand:product.brand}:{}),...(product&&(!value.year||(value.sport==='Hockey'&&/^\d{4}$/.test(value.year)))?{year:product.year}:{})});}:undefined}/></div>;}
  return (
    <div className="formGrid">
      {reviewFields.length ? <section className="fieldBlockWide scanReviewPanel" aria-label="Scan fields to review"><h3>{reviewFields.length} {reviewFields.length===1?'field needs':'fields need'} a closer look</h3><p className="helperText">These details were uncertain or missing. Correct a field, or mark it reviewed after checking your card.</p>{reviewFields.map(row=><div className="scanReviewItem" key={row.field}><div><button type="button" className="scanReviewLink" onClick={()=>document.getElementById(`${id}-${row.field}`)?.focus()}>{({cardNumber:'Card number',serialNumber:'Serial number',relicPatch:'Relic/Patch',gradingCompany:'Grading company'} as Record<string,string>)[row.field] || row.field.charAt(0).toUpperCase()+row.field.slice(1)}</button><p className="helperText">{row.reason}</p></div><button type="button" className="btn ghost" onClick={()=>onReview?.(row.field)}>Mark reviewed</button></div>)}</section>:null}
      <div className="fieldBlockWide cardReferenceNotice"><details><summary>How suggestions work</summary><p className="helperText">Type or choose a suggestion. Set choices follow your sport, brand and year. A listed set can fill an empty brand and year; every field stays editable. Hockey uses seasons such as 2025–26. A calendar year shows both seasons spanning it; choosing a listed set selects its exact season.</p></details><details><summary>{catalogLoading?'Updating reference suggestions…':'Reference sources & updates'}</summary><p className="helperText">Public references refresh automatically, with scheduled daily checks. Player lists reflect current NHL/MLB listings; use the team printed on older cards. Set coverage depends on published checklists. Unlisted sets and variations can always be entered manually.</p>{catalog?.sources.map(source=><p className="helperText" key={source.name}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a> · {source.status==='saved'?'Saved reference copy · ':''}checked {new Date(source.checkedAt).toLocaleString()}</p>)}{catalogError?<p className="helperText">{catalogError}</p>:null}</details></div>
      <h3 className="fieldBlockWide formSectionTitle">Card identity</h3>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-sport`}> Sport</label><select id={`${id}-sport`} className={needsReview("sport")?"input scanReviewField":"input"} value={value.sport} onChange={(e) => setField("sport", e.target.value as Sport)}>{sportOptions.map((sport) => <option key={sport}>{sport}</option>)}</select></div>
      {suggestion("player","Player")}
      {suggestion("year","Year")}
      {suggestion("brand","Brand")}
      {suggestion("set","Set")}
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-cardNumber`}> Card Number</label><input id={`${id}-cardNumber`} className={needsReview("cardNumber")?"input scanReviewField":"input"} value={value.cardNumber} onChange={(e) => setField("cardNumber", e.target.value)} /></div>
      {suggestion("team","Team")}
      <details className="fieldBlockWide cardVariantSection" open={collapsibleExtras ? undefined : true}><summary>Variation & grading · optional</summary><div className="formGrid">
      {suggestion("subset","Subset")}
      <p className="helperText fieldBlockWide">Subset and parallel are optional. Suggestions include common terms, not a complete checklist for this release. Choose only what appears on your card; leave blank for an ordinary base card or type an unlisted variation.</p>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-serialNumber`}> Serial Number</label><input id={`${id}-serialNumber`} className={needsReview("serialNumber")?"input scanReviewField":"input"} value={value.serialNumber} onChange={(e) => setField("serialNumber", e.target.value)} /></div>
      {suggestion("parallel","Parallel")}
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-gradingCompany`}> Grading Company</label><select id={`${id}-gradingCompany`} className={needsReview("gradingCompany")?"input scanReviewField":"input"} value={value.gradingCompany} onChange={(e) => setField("gradingCompany", e.target.value as GradingCompany)}>{gradingOptions.map((opt) => <option key={opt} value={opt}>{opt || "Select one"}</option>)}</select></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-grade`}> Grade</label><input id={`${id}-grade`} className={needsReview("grade")?"input scanReviewField":"input"} value={value.grade} onChange={(e) => setField("grade", e.target.value)} /></div>
      <div className="toggleGroup fieldBlockWide">
        <label className="checkRow"><input id={`${id}-rookie`} type="checkbox" checked={value.rookie} onChange={(e) => setField("rookie", e.target.checked)} /><span>Rookie</span></label>
        <label className="checkRow"><input id={`${id}-autograph`} type="checkbox" checked={value.autograph} onChange={(e) => setField("autograph", e.target.checked)} /><span>Autograph</span></label>
        <label className="checkRow"><input id={`${id}-relicPatch`} type="checkbox" checked={value.relicPatch} onChange={(e) => setField("relicPatch", e.target.checked)} /><span>Relic/Patch</span></label>
      </div>
      </div></details>
      <h3 className="fieldBlockWide formSectionTitle">Your collection</h3>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-quantity`}>{wanted ? "Desired quantity" : "Quantity"}</label><input id={`${id}-quantity`} className="input" type="number" min={1} value={value.quantity} onChange={(e) => setField("quantity", Number(e.target.value || 1))} /></div>
      {!wanted ? <div className="fieldBlock"><label className="label" htmlFor={`${id}-estimatedValueCad`}> Estimated Value CAD</label><input id={`${id}-estimatedValueCad`} className="input" type="number" min={0} step="0.01" value={value.estimatedValueCad} onChange={(e) => setField("estimatedValueCad", Number(e.target.value || 0))} /></div> : null}
      <div className="fieldBlock fieldBlockWide"><label className="label" htmlFor={`${id}-notes`}> Notes</label><textarea id={`${id}-notes`} className="input textarea" value={value.notes} onChange={(e) => setField("notes", e.target.value)} /></div>
      {showImageFields ? (<><ImagePicker label="Front Image" image={value.frontImage} onChange={(v) => setField("frontImage", v)} /><ImagePicker label="Back Image" image={value.backImage} onChange={(v) => setField("backImage", v)} /></>) : null}
      {collapsibleExtras ? <details className="fieldBlockWide"><summary>Find reference photos · optional</summary><ReferencePhotos key={value.id} card={value} onChange={onChange}/></details> : <ReferencePhotos key={value.id} card={value} onChange={onChange}/>}
    </div>
  );
}
