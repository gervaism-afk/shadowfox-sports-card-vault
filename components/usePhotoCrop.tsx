"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoCropDialog from './PhotoCropDialog';
export function usePhotoCrop() {
 const [pending,setPending]=useState<{image:string;label:string}|null>(null);
 const resolver=useRef<((image:string|null)=>void)|null>(null);
 useEffect(()=>()=>{resolver.current?.(null);resolver.current=null;},[]);
 const chooseCrop=useCallback((image:string,label:string)=>new Promise<string|null>(resolve=>{
  resolver.current?.(null);resolver.current=resolve;setPending({image,label});
 }),[]);
 const finish=useCallback((image:string|null)=>{const resolve=resolver.current;resolver.current=null;setPending(null);resolve?.(image);},[]);
 return {chooseCrop,cropDialog:pending?<PhotoCropDialog key={pending.image} image={pending.image} label={pending.label} onDone={finish}/>:null};
}
