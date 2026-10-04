"use client";
import { useEffect, useRef, useState } from "react";
import { usePhotoCrop } from "./usePhotoCrop";
import { prepareCardImage } from "@/lib/images";

export default function ImagePicker({ label, image, onChange }: { label: string; image: string; onChange: (value: string) => void }) {
  const { chooseCrop, cropDialog } = usePhotoCrop();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const run = useRef(0);
  useEffect(() => () => { run.current++; }, []);
  async function pick(file: File) {
    const task = ++run.current; setBusy(true); setError("");
    try { const prepared = await prepareCardImage(file); if (task !== run.current) return; const value = await chooseCrop(prepared, label); if (value && task === run.current) onChange(value); }
    catch (e) { if (task === run.current) setError(e instanceof Error ? e.message : "Could not prepare photo."); }
    finally { if (task === run.current) setBusy(false); }
  }
  return (
    <div className="fieldBlock">
      {cropDialog}
      <label className="label">{label}</label>
      <div className="buttonRow"><label className="btn primary">Take photo<input aria-label={`Take ${label.toLowerCase()} photo`} type="file" className="uploadInput" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void pick(file); }}/></label><label className="btn ghost">Upload<input
        aria-label={`Upload ${label.toLowerCase()}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="uploadInput"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          void pick(file);
        }}
      /></label>{image ? <button type="button" className="btn ghost" disabled={busy} onClick={() => onChange("")}>Remove {label.toLowerCase()}</button> : null}</div>
      {busy || error ? <p role="status" className="helperText">{busy ? "Preparing photo…" : error}</p> : null}
      <div className="previewCard cardFrame">{image ? <img src={image} alt={label} /> : <span>No image selected</span>}</div>
    </div>
  );
}
