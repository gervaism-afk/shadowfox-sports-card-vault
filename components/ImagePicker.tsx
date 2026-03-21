"use client";

export default function ImagePicker({ label, image, onChange }: { label: string; image: string; onChange: (value: string) => void }) {
  return (
    <div className="fieldBlock">
      <label className="label">{label}</label>
      <input
        type="file"
        accept="image/*"
        className="input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => onChange(String(reader.result || ""));
          reader.readAsDataURL(file);
        }}
      />
      <div className="previewCard cardFrame">{image ? <img src={image} alt={label} /> : <span>No image selected</span>}</div>
    </div>
  );
}
