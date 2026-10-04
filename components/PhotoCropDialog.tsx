"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";

type Rect = { x: number; y: number; w: number; h: number };
const full: Rect = { x: 0, y: 0, w: 100, h: 100 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function PhotoCropDialog({ image, label, onDone }: { image: string; label: string; onDone: (value: string | null) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), photo = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; rect: Rect; corner: string } | null>(null);
  const [rect, setRect] = useState<Rect>(full), [ratio, setRatio] = useState(1), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  function start(event: PointerEvent<HTMLDivElement>) {
    if (busy || !ready || event.button !== 0) return;
    const target = event.target as HTMLElement;
    const corner = target.dataset.corner || (target.closest('[data-move]') ? "move" : "");
    if (!corner) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, rect, corner };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current; if (!current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX-current.x)/bounds.width*100, dy = (event.clientY-current.y)/bounds.height*100;
    const r = current.rect;
    if (current.corner === "move") { setRect({...r,x:clamp(r.x+dx,0,100-r.w),y:clamp(r.y+dy,0,100-r.h)}); return; }
    const left = current.corner.includes('w') ? clamp(r.x+dx,0,r.x+r.w-5) : r.x;
    const top = current.corner.includes('n') ? clamp(r.y+dy,0,r.y+r.h-5) : r.y;
    const right = current.corner.includes('e') ? clamp(r.x+r.w+dx,r.x+5,100) : r.x+r.w;
    const bottom = current.corner.includes('s') ? clamp(r.y+r.h+dy,r.y+5,100) : r.y+r.h;
    setRect({x:left,y:top,w:right-left,h:bottom-top});
  }
  async function useCrop() {
    if (!photo.current || !ready || busy) return;
    setBusy(true); setError("");
    try {
      const img=photo.current, canvas=document.createElement('canvas');
      const x=Math.round(img.naturalWidth*rect.x/100), y=Math.round(img.naturalHeight*rect.y/100);
      const width=Math.min(img.naturalWidth-x,Math.max(1,Math.round(img.naturalWidth*rect.w/100)));
      const height=Math.min(img.naturalHeight-y,Math.max(1,Math.round(img.naturalHeight*rect.h/100)));
      canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');if(!context)throw new Error('Could not crop this photo.');
      context.drawImage(img,x,y,width,height,0,0,width,height);
      onDone(canvas.toDataURL('image/jpeg',.92));
    } catch(e) {setError(e instanceof Error?e.message:'Could not crop this photo.');setBusy(false);}
  }
  return <dialog ref={dialog} className="photoCropDialog" aria-labelledby="crop-title" onCancel={event=>{event.preventDefault();if(!busy)onDone(null);}}>
    <div className="photoCropHeader"><div><span className="vaultEyebrow">FRAME YOUR CARD</span><h2 id="crop-title">Crop {label.toLowerCase()}</h2></div><button type="button" className="btn ghost" disabled={busy} onClick={()=>onDone(null)} aria-label="Cancel photo crop">×</button></div>
    <p className="helperText">Drag the corners around your card. Move the frame to adjust its position.</p>
    <div className="photoCropStage" style={{width:`min(100%, ${ratio*46}dvh)`,aspectRatio:ratio}} onPointerDown={start} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
      <img ref={photo} src={image} alt="Photo to crop" draggable={false} onLoad={event=>{const img=event.currentTarget;setRatio(img.naturalWidth/img.naturalHeight);setReady(true);}} onError={()=>setError('Could not open this photo. Choose another image.')}/>
      {ready ? <div className="photoCropFrame" data-move="true" style={{left:`${rect.x}%`,top:`${rect.y}%`,width:`${rect.w}%`,height:`${rect.h}%`}}><div className="photoCropGrid" aria-hidden="true"/>{['nw','ne','sw','se'].map(corner=><span key={corner} data-corner={corner} className={`photoCropHandle ${corner}`} aria-hidden="true"/>)}</div> : null}
    </div>
    <details className="photoCropAdjust"><summary>Fine adjustments</summary><div className="photoCropSliders">{(['x','y','w','h'] as const).map(key=><label key={key}>{({x:'Horizontal position',y:'Vertical position',w:'Crop width',h:'Crop height'})[key]}<input type="range" aria-label={({x:'Horizontal crop position',y:'Vertical crop position',w:'Crop width',h:'Crop height'})[key]} min={key==='w'||key==='h'?5:0} max={key==='x'?100-rect.w:key==='y'?100-rect.h:key==='w'?100-rect.x:100-rect.y} value={rect[key]} disabled={busy} onChange={event=>setRect(previous=>({...previous,[key]:Number(event.target.value)}))}/></label>)}</div></details>
    {error ? <p role="alert">{error}</p> : null}
    <div className="photoCropActions"><button type="button" className="btn ghost" disabled={busy || !ready} onClick={()=>onDone(image)}>Use full photo</button><button type="button" className="btn primary" disabled={busy || !ready} onClick={()=>void useCrop()}>{busy?'Cropping…':'Use cropped photo'}</button></div>
    <p className="photoCropNote">This prepares your photo. Save the card to keep it in your vault.</p>
  </dialog>;
}
