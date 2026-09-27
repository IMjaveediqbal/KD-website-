"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form,setForm]=useState({displayName:"",username:"",email:"",password:""}); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");const r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,username:form.username||undefined})});const d=await r.json();setLoading(false);if(!r.ok){setError(d.error);return}window.location.href="/dashboard";}
  return <main className="authPage"><div className="authCard"><div className="sectionLabel">CONTRIBUTOR ACCOUNT</div><h1>Create your account</h1><p>Start preserving Khowar with accountable, traceable contributions.</p><form onSubmit={submit}><label>Display name<input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} required /></label><label>Username <span>(optional)</span><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} /></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></label><label>Password <span>(10+ characters)</span><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} minLength={10} required /></label>{error&&<div className="errorBox">{error}</div>}<button className="button" disabled={loading}>{loading?"Creating…":"Create contributor account"}</button></form><p className="authFooter">Already registered? <Link href="/login">Sign in</Link></p></div></main>;
}
