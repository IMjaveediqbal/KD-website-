"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});const d=await r.json();setLoading(false);if(!r.ok){setError(d.error);return}window.location.href="/dashboard";}
  return <main className="authPage"><div className="authCard"><div className="sectionLabel">KHОWAR DATASET</div><h1>Sign in</h1><p>Access your contributor workspace.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>{error&&<div className="errorBox">{error}</div>}<button className="button" disabled={loading}>{loading?"Signing in…":"Sign in"}</button></form><p className="authFooter">New contributor? <Link href="/register">Create an account</Link></p></div></main>;
}
