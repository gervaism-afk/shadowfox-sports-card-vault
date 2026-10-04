"use client";
import { useId } from 'react';
import { useAuth } from './AuthProvider';
import { CARD_SIZES, CARD_SIZE_LABELS, useCardSize } from '@/lib/preferences/card-size';
export default function CardDisplaySettings() {
 const {user}=useAuth(), id=useId();const {size,setSize}=useCardSize(user?.id);
 return <section className="panel cardDisplaySettings"><h2>Card display size</h2><p className="helperText">Choose how large your card photos appear in the collection, overview, and binders.</p>
 <fieldset className="cardSizeChoices" disabled={!user}><legend className="srOnly">Card display size</legend>{CARD_SIZES.map(option=><label className={`cardSizeChoice ${size===option?'isSelected':''}`} key={option}>
 <input type="radio" name={`${id}-card-size`} value={option} checked={size===option} onChange={()=>setSize(option)}/><span className="cardSizeIllustration" aria-hidden="true"><span style={{width:({small:26,medium:34,large:43,'extra-large':54})[option],height:({small:36,medium:48,large:60,'extra-large':76})[option]}}>SF</span></span><strong>{CARD_SIZE_LABELS[option]}</strong></label>)}</fieldset>
 <p className="helperText" role="status">{CARD_SIZE_LABELS[size]} selected · saved automatically on this device.</p></section>;
}
