"use client";
import { useEffect,useRef,useState } from 'react';
import { normalizeOption } from '@/lib/catalog/types';
export type CardSuggestion = {value:string;detail?:string;key?:string};
export default function CardSuggestionInput({id,label,value,onChange,options,onSelect}:{id:string;label:string;value:string;onChange:(value:string)=>void;options:CardSuggestion[];onSelect?:(option:CardSuggestion)=>void}){
  const [open,setOpen]=useState(false),[all,setAll]=useState(false),[active,setActive]=useState(-1);
  const wrapper=useRef<HTMLDivElement>(null);const input=useRef<HTMLInputElement>(null);
  const query=all?'':normalizeOption(value);
  const matches=options.filter(option=>!query||normalizeOption(option.value+' '+(option.detail||'')).includes(query));const visible=matches.slice(0,80);
  useEffect(()=>{setActive(-1);},[value,options]);
  useEffect(()=>{if(active>=0)wrapper.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView({block:'nearest'});},[active]);
  function choose(option:CardSuggestion){if(onSelect)onSelect(option);else onChange(option.value);input.current?.focus();setOpen(false);setActive(-1);}
  return <div className="fieldBlock"><label className="label" htmlFor={id}>{label}</label><div className="cardSuggestionControl" ref={wrapper} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false);}}>
    <input ref={input} className="input" id={id} value={value} maxLength={250} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open&&active>=0?`${id}-option-${active}`:undefined} onFocus={()=>{setOpen(true);setAll(false);}} onChange={e=>{onChange(e.target.value);setAll(false);setOpen(true);}} onKeyDown={e=>{
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(previous=>e.key==='ArrowDown'?Math.min(previous+1,visible.length-1):Math.max(previous-1,0));}
      else if(e.key==='Enter'&&open&&active>=0&&visible[active]){e.preventDefault();choose(visible[active]);}
      else if(e.key==='Escape'){e.preventDefault();setOpen(false);}
      else if(e.key==='Tab')setOpen(false);
    }}/>
    <button type="button" className="cardSuggestionToggle" aria-label={`Show ${label.toLowerCase()} suggestions`} aria-expanded={open} onMouseDown={e=>e.preventDefault()} onClick={()=>{setAll(true);setOpen(!open);}}>▾</button>
    {open?<div className="cardSuggestionDropdown"><ul role="listbox" id={`${id}-options`} aria-label={`${label} suggestions`}>{visible.map((option,index)=><li key={option.key||option.value}><button type="button" role="option" data-option-index={index} id={`${id}-option-${index}`} aria-selected={active===index} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(option)}><span>{option.value}</span>{option.detail?<small>{option.detail}</small>:null}</button></li>)}</ul><p>{matches.length>80?`${matches.length} suggestions. Type to narrow the list.`:matches.length?'Choose a suggestion or type your own value.':'No listed match. Your typed value is still allowed.'}</p></div>:null}
  </div></div>;
}
