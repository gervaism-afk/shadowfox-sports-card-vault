"use client";

import { useEffect, useId, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import PasswordInput from "./PasswordInput";
import { remembersSession, setRememberSession } from "@/lib/session-storage";

export default function LoginPanel() {
  const id = useId();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const [remember, setRemember] = useState(true);
  useEffect(() => { setRemember(remembersSession()); }, []);

  async function handleLogin() {
    if (!supabase || !isSupabaseConfigured()) return setStatus("Supabase is not configured.");
    try {
      setBusy(true);
      setStatus("Signing in…");
      setRememberSession(remember);
      const loginEmail = identifier.trim();
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
      setStatus("Signed in.");
    } catch (e: any) {
      setStatus(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    if (!supabase || !isSupabaseConfigured()) return setStatus("Supabase is not configured.");
    try {
      setBusy(true);
      setStatus("Creating account…");
      const name = username.trim();
      if (!name) throw new Error("Username is required.");
      if (!email.trim()) throw new Error("Email is required.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

      setRememberSession(remember);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: name } },
      });
      if (error) throw error;

      setStatus(data.session ? "Account created. Opening your vault…" : "Account created. Check your email to confirm, then log in.");
      setMode("login");
      setIdentifier(email.trim());
      setPassword("");
    } catch (e: any) {
      setStatus(e.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!supabase || !isSupabaseConfigured()) return setStatus("Supabase is not configured.");
    try {
      setBusy(true);
      setStatus("Sending reset link…");
      const targetEmail = email.trim();
      if (!targetEmail) throw new Error("Enter your email address first.");
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });
      if (error) throw error;
      setStatus("Password reset email sent. Check your inbox.");
    } catch (e: any) {
      setStatus(e.message || "Reset request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="authCard premiumLogin">
      <div className="authLoginBadge">Your private vault</div>
      <div className="authTabs">
        <button type="button" aria-pressed={mode === "login"} className={mode === "login" ? "authTab active" : "authTab"} onClick={() => setMode("login")}>Log In</button>
        <button type="button" aria-pressed={mode === "signup"} className={mode === "signup" ? "authTab active" : "authTab"} onClick={() => setMode("signup")}>Create Account</button>
        <button type="button" aria-pressed={mode === "forgot"} className={mode === "forgot" ? "authTab active" : "authTab"} onClick={() => setMode("forgot")}>Forgot Password</button>
      </div>

      {mode === "login" ? (
        <form className="authForm" onSubmit={(event) => { event.preventDefault(); void handleLogin(); }}>
          <label className="label" htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" />
          <label className="label" htmlFor={`${id}-password`}>Password</label>
          <PasswordInput id={`${id}-password`} className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
          <label className="checkRow"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /><span>Remember me on this device</span></label>
          <p className="helperText">Leave unchecked to keep your login in this tab only.</p>
          <button type="submit" className="btn primary" disabled={busy}>Log In</button>
        </form>
      ) : mode === "signup" ? (
        <form className="authForm" onSubmit={(event) => { event.preventDefault(); void handleSignup(); }}>
          <label className="label" htmlFor={`${id}-username`}>Username</label>
          <input id={`${id}-username`} className="input" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" />
          <label className="label" htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <label className="label" htmlFor={`${id}-password`}>Password</label>
          <PasswordInput id={`${id}-password`} className="input" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          <label className="checkRow"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /><span>Remember me on this device</span></label>
          <button type="submit" className="btn primary" disabled={busy}>Create Account</button>
        </form>
      ) : (
        <form className="authForm" onSubmit={(event) => { event.preventDefault(); void handleForgotPassword(); }}>
          <label className="label" htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your account email" />
          <button type="submit" className="btn primary" disabled={busy}>Send Reset Link</button>
        </form>
      )}

      {status ? <div className="helperText" role="status" style={{ marginTop: 12 }}>{status}</div> : null}
    </section>
  );
}
