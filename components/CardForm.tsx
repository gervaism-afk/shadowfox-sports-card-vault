"use client";

import { CardRecord, GradingCompany, Sport } from "@/lib/types";
import ImagePicker from "@/components/ImagePicker";

const gradingOptions: GradingCompany[] = ["", "PSA", "BGS", "SGC", "CGC", "Other"];
const sportOptions: Sport[] = ["Hockey", "Baseball"];

export default function CardForm({ value, onChange, showImageFields = true }: { value: CardRecord; onChange: (card: CardRecord) => void; showImageFields?: boolean; }) {
  const setField = <K extends keyof CardRecord>(key: K, next: CardRecord[K]) => onChange({ ...value, [key]: next });

  return (
    <div className="formGrid">
      <div className="fieldBlock"><label className="label">Sport</label><select className="input" value={value.sport} onChange={(e) => setField("sport", e.target.value as Sport)}>{sportOptions.map((sport) => <option key={sport}>{sport}</option>)}</select></div>
      <div className="fieldBlock"><label className="label">Player</label><input className="input" value={value.player} onChange={(e) => setField("player", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Year</label><input className="input" value={value.year} onChange={(e) => setField("year", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Brand</label><input className="input" value={value.brand} onChange={(e) => setField("brand", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Set</label><input className="input" value={value.set} onChange={(e) => setField("set", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Subset</label><input className="input" value={value.subset} onChange={(e) => setField("subset", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Card Number</label><input className="input" value={value.cardNumber} onChange={(e) => setField("cardNumber", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Team</label><input className="input" value={value.team} onChange={(e) => setField("team", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Serial Number</label><input className="input" value={value.serialNumber} onChange={(e) => setField("serialNumber", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Parallel</label><input className="input" value={value.parallel} onChange={(e) => setField("parallel", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Grading Company</label><select className="input" value={value.gradingCompany} onChange={(e) => setField("gradingCompany", e.target.value as GradingCompany)}>{gradingOptions.map((opt) => <option key={opt} value={opt}>{opt || "Select one"}</option>)}</select></div>
      <div className="fieldBlock"><label className="label">Grade</label><input className="input" value={value.grade} onChange={(e) => setField("grade", e.target.value)} /></div>
      <div className="fieldBlock"><label className="label">Quantity</label><input className="input" type="number" min={1} value={value.quantity} onChange={(e) => setField("quantity", Number(e.target.value || 1))} /></div>
      <div className="fieldBlock"><label className="label">Estimated Value CAD</label><input className="input" type="number" min={0} step="0.01" value={value.estimatedValueCad} onChange={(e) => setField("estimatedValueCad", Number(e.target.value || 0))} /></div>
      <div className="fieldBlock fieldBlockWide"><label className="label">Notes</label><textarea className="input textarea" value={value.notes} onChange={(e) => setField("notes", e.target.value)} /></div>
      <div className="toggleGroup fieldBlockWide">
        <label className="checkRow"><input type="checkbox" checked={value.rookie} onChange={(e) => setField("rookie", e.target.checked)} /><span>Rookie</span></label>
        <label className="checkRow"><input type="checkbox" checked={value.autograph} onChange={(e) => setField("autograph", e.target.checked)} /><span>Autograph</span></label>
        <label className="checkRow"><input type="checkbox" checked={value.relicPatch} onChange={(e) => setField("relicPatch", e.target.checked)} /><span>Relic/Patch</span></label>
      </div>
      {showImageFields ? (<><ImagePicker label="Front Image" image={value.frontImage} onChange={(v) => setField("frontImage", v)} /><ImagePicker label="Back Image" image={value.backImage} onChange={(v) => setField("backImage", v)} /></>) : null}
    </div>
  );
}
