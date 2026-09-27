"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const types=["WORD","SENTENCE","TRANSLATION","PROVERB","STORY","VOICE"];

export default function ContributePage(){
  const [type,setType]=useState("WORD"); const [text,setText]=useState(""); const [english,setEnglish]=useState(""); const [urdu,setUrdu]=useState(""); const [dialect,setDialect]=useState(""); const [region,setRegion]=useState(""); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setMessage("");const r=await fetch("/api/contributions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:crypto.randomUUID(),type,originalText:text,englishTranslation:english||null,urduTranslation:urdu||null,dialect:dialect||null,region:region||null})});const d=await r.json();setLoading(false);if(!r.ok){setMessage(d.error);return}setMessage("Draft saved. You can review it from your dashboard.");setText("");setEnglish("");setUrdu("");}
  return <main className="pageShell"><div className="sectionLabel">NEW CONTRIBUTION</div><div className="formHeader"><div><h1>Preserve a piece of Khowar.</h1><p>Your original text is stored separately from any future normalization. Nothing silently replaces the source record.</p></div><Link href="/dashboard">Back to dashboard</Link></div><form className="contributionForm" onSubmit={submit}><label>Contribution type<select value={type} onChange={e=>setType(e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select></label><label>Original Khowar text<textarea value={text} onChange={e=>setText(e.target.value)} required rows={6} placeholder="Enter the original Khowar record…" /></label><div className="twoCol"><label>English translation<textarea value={english} onChange={e=>setEnglish(e.target.value)} rows={4}/></label><label>Urdu translation<textarea value={urdu} onChange={e=>setUrdu(e.target.value)} rows={4}/></label></div><div className="twoCol"><label>Dialect<input value={dialect} onChange={e=>setDialect(e.target.value)} /></label><label>Region<input value={region} onChange={e=>setRegion(e.target.value)} /></label></div>{message&&<div className="successBox">{message}</div>}<button className="button" disabled={loading}>{loading?"Saving…":"Save draft"}</button></form></main>;
}
