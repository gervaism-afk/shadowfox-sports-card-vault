"use client";

import { useId, useState } from "react";
import PageShell from "@/components/PageShell";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleUpdatePassword() {
    if (!supabase || !isSupabaseConfigured()) return setStatus("Supabase is not configured.");
    try {
      setBusy(true);
      setStatus("Updating password…");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (password !== confirm) throw new Error("Passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("Password updated. You can now go back and log in.");
      setPassword("");
      setConfirm("");
    } catch (e: any) {
      setStatus(e.message || "Password update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Reset Password">
      <section className="panel" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="helperText" style={{ marginBottom: 16 }}>
          Enter your new password below after opening the reset link from your email.
        </div>
        <form className="authForm" onSubmit={(event) => { event.preventDefault(); void handleUpdatePassword(); }}>
          <label className="label" htmlFor={`${id}-password`}>New Password</label>
          <input id={`${id}-password`} className="input" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          <label className="label" htmlFor={`${id}-confirm`}>Confirm New Password</label>
          <input id={`${id}-confirm`} className="input" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
          <button className="btn primary" type="submit" disabled={busy}>Update Password</button>
        </form>
        {status ? <div className="helperText" role="status" style={{ marginTop: 12 }}>{status}</div> : null}
      </section>
    </PageShell>
  );
}
