"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string; email: string; displayName: string | null; username: string | null; role: string;
  profile?: { dialect: string | null; region: string | null } | null;
};

type Contribution = { id: string; type: string; status: string; originalText: string | null; createdAt: string };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Contribution[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/auth/me"), fetch("/api/contributions")]).then(async ([u, c]) => {
      if (u.status === 401) { window.location.href = "/login"; return; }
      const userData = await u.json(); const contributionData = await c.json();
      setUser(userData.user); setItems(contributionData.items ?? []);
      if (!c.ok) setError(contributionData.error ?? "Unable to load contributions.");
    }).catch(() => setError("Network error. Please try again."));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (!user) return <main className="pageShell"><p>Loading your workspace…</p></main>;

  return (
    <main className="pageShell">
      <header className="dashboardHeader">
        <div><div className="sectionLabel">CONTRIBUTOR WORKSPACE</div><h1>Welcome, {user.displayName ?? user.username ?? "Contributor"}.</h1><p>{user.profile?.region || "Your contributions"} · {user.role}</p></div>
        <div className="dashboardActions"><Link className="button" href="/contribute">New contribution</Link><Link className="button buttonGhost" href="/profile">Profile</Link><button className="button buttonGhost" onClick={logout}>Sign out</button></div>
      </header>
      {error && <div className="errorBox">{error}</div>}
      <section className="dashboardGrid">
        <article className="dashboardCard"><span>Total loaded</span><strong>{items.length}</strong><small>Recent contributions</small></article>
        <article className="dashboardCard"><span>Validated</span><strong>{items.filter(x => x.status === "VALIDATED").length}</strong><small>From real database records</small></article>
        <article className="dashboardCard"><span>In review</span><strong>{items.filter(x => ["SUBMITTED","UNDER_REVIEW","EXPERT_REVIEW"].includes(x.status)).length}</strong><small>Awaiting review</small></article>
      </section>
      <section className="dashboardSection"><div className="sectionHeading"><h2>Recent contributions</h2><Link href="/contribute">Add another</Link></div>{items.length === 0 ? <div className="emptyState">No contributions yet. Your first Khowar record can start here.</div> : <div className="contributionList">{items.map(item => <div className="contributionRow" key={item.id}><div><b>{item.type}</b><p>{item.originalText || "Draft without text"}</p></div><span className={"status status-"+item.status.toLowerCase()}>{item.status.replaceAll("_"," ")}</span></div>)}</div>}</section>
    </main>
  );
}
