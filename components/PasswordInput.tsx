"use client";
import { useState, type InputHTMLAttributes } from "react";
export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return <div className="passwordControl">
    <input {...props} type={visible ? "text" : "password"} />
    <button type="button" className="passwordToggle" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button>
  </div>;
}
