"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";
import PageShell from "@/components/PageShell";
import PasswordInput from "@/components/PasswordInput";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    let active = true;
    if (!user || !supabase) return;
    setLoading(true);
    supabase.from("profiles").select("username").eq("id", user.id).single().then(({ data, error }) => {
      if (!active) return;
      if (error) setStatus("Could not load your profile. Refresh to try again.");
      else setName(data.username || "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  async function saveName() {
    if (!user || !supabase || busy) return;
    setBusy(true); setStatus("");
    try {
      const username = name.trim();
      if (!username || username.length > 80) throw new Error("Enter a name of 1–80 characters.");
      const { data, error } = await supabase.from("profiles").update({ username }).eq("id", user.id).select("username").single();
      if (error) throw error;
      setName(data.username); setStatus("Name saved.");
    } catch (e: any) { setStatus(e.message || "Could not save your name."); }
    finally { setBusy(false); }
  }
  async function changePassword() {
    if (!user?.email || !supabase || busy) return;
    setBusy(true); setStatus("");
    try {
      if (password.length < 6) throw new Error("Use at least 6 characters.");
      if (password !== confirm) throw new Error("New passwords do not match.");
      const verified = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (verified.error) throw new Error("Your current password is incorrect. Use Forgot Password if you need a reset.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setCurrent(""); setPassword(""); setConfirm(""); setStatus("Password updated.");
    } catch (e: any) { setStatus(e.message || "Could not update your password."); }
    finally { setBusy(false); }
  }
  async function signOutEverywhere() {
    if (!supabase || busy) return;
    setBusy(true); setStatus("");
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) { setStatus(error.message); setBusy(false); }
    else router.replace("/login");
  }
  return <AuthGate><PageShell title="Account settings"><div className="accountSettings">
    <section className="panel"><h2>Your profile</h2><p className="helperText">Your email: {user?.email}</p>
      <form className="authForm" onSubmit={e => { e.preventDefault(); void saveName(); }}>
        <label className="label" htmlFor={`${id}-name`}>Display name</label>
        <input className="input" id={`${id}-name`} autoComplete="nickname" required maxLength={80} value={name} disabled={loading || busy} onChange={e => setName(e.target.value)} />
        <button className="btn primary" disabled={loading || busy}>Save name</button>
      </form>
    </section>
    <section className="panel"><h2>Change password</h2><form className="authForm" onSubmit={e => { e.preventDefault(); void changePassword(); }}>
      <label className="label" htmlFor={`${id}-current`}>Current password</label><PasswordInput className="input" id={`${id}-current`} autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} />
      <label className="label" htmlFor={`${id}-new`}>New password</label><PasswordInput className="input" id={`${id}-new`} autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
      <label className="label" htmlFor={`${id}-confirm`}>Confirm new password</label><PasswordInput className="input" id={`${id}-confirm`} autoComplete="new-password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} />
      <button className="btn primary" disabled={busy}>Update password</button>
    </form></section>
    <section className="panel"><h2>Your data and security</h2><p className="helperText">Export your cards from the collection page. Sign out everywhere if you used a shared or lost device. Existing access tokens can remain valid until they expire.</p><div className="buttonRow"><Link className="btn ghost" href="/collection">Collection &amp; export</Link><button className="btn ghost" disabled={busy} onClick={() => void signOutEverywhere()}>Sign out on all devices</button></div></section>
    {status ? <p className="workflowNotice" role="status">{status}</p> : null}
  </div></PageShell></AuthGate>;
}
