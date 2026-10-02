"use client";

import { useId } from "react";
import { CardRecord, GradingCompany, Sport } from "@/lib/types";
import ImagePicker from "@/components/ImagePicker";

const gradingOptions: GradingCompany[] = ["", "PSA", "BGS", "SGC", "CGC", "Other"];
const sportOptions: Sport[] = ["Hockey", "Baseball"];

export default function CardForm({ value, onChange, showImageFields = true }: { value: CardRecord; onChange: (card: CardRecord) => void; showImageFields?: boolean; }) {
  const id = useId();
  const setField = <K extends keyof CardRecord>(key: K, next: CardRecord[K]) => onChange({ ...value, [key]: next });

  return (
    <div className="formGrid">
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-sport`}> Sport</label><select id={`${id}-sport`} className="input" value={value.sport} onChange={(e) => setField("sport", e.target.value as Sport)}>{sportOptions.map((sport) => <option key={sport}>{sport}</option>)}</select></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-player`}> Player</label><input id={`${id}-player`} className="input" value={value.player} onChange={(e) => setField("player", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-year`}> Year</label><input id={`${id}-year`} className="input" value={value.year} onChange={(e) => setField("year", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-brand`}> Brand</label><input id={`${id}-brand`} className="input" value={value.brand} onChange={(e) => setField("brand", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-set`}> Set</label><input id={`${id}-set`} className="input" value={value.set} onChange={(e) => setField("set", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-subset`}> Subset</label><input id={`${id}-subset`} className="input" value={value.subset} onChange={(e) => setField("subset", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-cardNumber`}> Card Number</label><input id={`${id}-cardNumber`} className="input" value={value.cardNumber} onChange={(e) => setField("cardNumber", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-team`}> Team</label><input id={`${id}-team`} className="input" value={value.team} onChange={(e) => setField("team", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-serialNumber`}> Serial Number</label><input id={`${id}-serialNumber`} className="input" value={value.serialNumber} onChange={(e) => setField("serialNumber", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-parallel`}> Parallel</label><input id={`${id}-parallel`} className="input" value={value.parallel} onChange={(e) => setField("parallel", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-gradingCompany`}> Grading Company</label><select id={`${id}-gradingCompany`} className="input" value={value.gradingCompany} onChange={(e) => setField("gradingCompany", e.target.value as GradingCompany)}>{gradingOptions.map((opt) => <option key={opt} value={opt}>{opt || "Select one"}</option>)}</select></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-grade`}> Grade</label><input id={`${id}-grade`} className="input" value={value.grade} onChange={(e) => setField("grade", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-quantity`}> Quantity</label><input id={`${id}-quantity`} className="input" type="number" min={1} value={value.quantity} onChange={(e) => setField("quantity", Number(e.target.value || 1))} /></div>
      <div className="fieldBlock"><label className="label" htmlFor={`${id}-estimatedValueCad`}> Estimated Value CAD</label><input id={`${id}-estimatedValueCad`} className="input" type="number" min={0} step="0.01" value={value.estimatedValueCad} onChange={(e) => setField("estimatedValueCad", Number(e.target.value || 0))} /></div>
      <div className="fieldBlock fieldBlockWide"><label className="label" htmlFor={`${id}-notes`}> Notes</label><textarea id={`${id}-notes`} className="input textarea" value={value.notes} onChange={(e) => setField("notes", e.target.value)} /></div>
      <div className="toggleGroup fieldBlockWide">
        <label className="checkRow"><input type="checkbox" checked={value.rookie} onChange={(e) => setField("rookie", e.target.checked)} /><span>Rookie</span></label>
        <label className="checkRow"><input type="checkbox" checked={value.autograph} onChange={(e) => setField("autograph", e.target.checked)} /><span>Autograph</span></label>
        <label className="checkRow"><input type="checkbox" checked={value.relicPatch} onChange={(e) => setField("relicPatch", e.target.checked)} /><span>Relic/Patch</span></label>
      </div>
      {showImageFields ? (<><ImagePicker label="Front Image" image={value.frontImage} onChange={(v) => setField("frontImage", v)} /><ImagePicker label="Back Image" image={value.backImage} onChange={(v) => setField("backImage", v)} /></>) : null}
    </div>
  );
}
