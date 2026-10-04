"use client";
import { useCallback, useSyncExternalStore } from 'react';
export const CARD_SIZES = ['small','medium','large','extra-large'] as const;
export type CardSize = typeof CARD_SIZES[number];
export const CARD_SIZE_LABELS: Record<CardSize,string> = {small:'Small',medium:'Medium',large:'Large','extra-large':'Extra Large'};
const changed='shadowfox-card-size-changed';
const memory = new Map<string,CardSize>();
function valid(value:unknown):value is CardSize { return CARD_SIZES.includes(value as CardSize); }
function subscribe(notify:()=>void) {
 window.addEventListener('storage',notify);window.addEventListener(changed,notify);
 return ()=>{window.removeEventListener('storage',notify);window.removeEventListener(changed,notify);};
}
export function useCardSize(userId?:string) {
 const key=userId?`shadowfox-card-size:${userId}`:'';
 const snapshot=useCallback(()=>{
  if(!key)return 'medium' as CardSize;
  if(memory.has(key))return memory.get(key)!;
  try {const value=localStorage.getItem(key);return valid(value)?value:'medium';}catch{return 'medium';}
 },[key]);
 const size=useSyncExternalStore(subscribe,snapshot,()=> 'medium' as CardSize);
 const setSize=useCallback((value:CardSize)=>{
  if(!key||!valid(value))return;
  try{localStorage.setItem(key,value);memory.delete(key);}catch{memory.set(key,value);}
  window.dispatchEvent(new Event(changed));
 },[key]);
 return {size,setSize};
}
