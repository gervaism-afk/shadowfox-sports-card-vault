"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

async function lookupEmailByUsername(username: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("profiles").select("email").ilike("username", username).limit(1).maybeSingle();
  if (error) throw error;
  return data?.email || null;
}

export default function LoginPanel() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (!supabase || !isSupabaseConfigured()) return setStatus("Supabase is not configured.");
    try {
      setBusy(true);
      setStatus("Signing in…");
      let loginEmail = identifier.trim();
      if (!identifier.includes("@")) {
        const resolved = await lookupEmailByUsername(identifier.trim());
        if (!resolved) throw new Error("Username not found.");
        loginEmail = resolved;
      }
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

      const { data: exists, error: existsError } = await supabase.from("profiles").select("username").ilike("username", name).limit(1);
      if (existsError) throw existsError;
      if ((exists || []).length > 0) throw new Error("Username is already taken.");

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: name } },
      });
      if (error) throw error;

      setStatus("Account created. Check your email to confirm, then log in.");
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
      const targetEmail = identifier.includes("@") ? identifier.trim() : email.trim();
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
      <div className="authLoginBadge">🔒 Private Multi-User Access</div>
      <div className="authTabs">
        <button className={mode === "login" ? "authTab active" : "authTab"} onClick={() => setMode("login")}>Log In</button>
        <button className={mode === "signup" ? "authTab active" : "authTab"} onClick={() => setMode("signup")}>Create Account</button>
        <button className={mode === "forgot" ? "authTab active" : "authTab"} onClick={() => setMode("forgot")}>Forgot Password</button>
      </div>

      {mode === "login" ? (
        <div className="authForm">
          <label className="label">Username or Email</label>
          <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="username or email" />
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
          <button className="btn primary" disabled={busy} onClick={handleLogin}>Log In</button>
        </div>
      ) : mode === "signup" ? (
        <div className="authForm">
          <label className="label">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="choose a username" />
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="minimum 6 characters" />
          <button className="btn primary" disabled={busy} onClick={handleSignup}>Create Account</button>
        </div>
      ) : (
        <div className="authForm">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="enter your account email" />
          <button className="btn primary" disabled={busy} onClick={handleForgotPassword}>Send Reset Link</button>
        </div>
      )}

      {status ? <div className="helperText" style={{ marginTop: 12 }}>{status}</div> : null}
    </section>
  );
}
