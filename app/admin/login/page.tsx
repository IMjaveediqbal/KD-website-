"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to sign in.");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard" aria-labelledby="admin-login-title">
        <div className="sectionLabel">KHOWAR DATASET · ADMINISTRATION</div>
        <h1 id="admin-login-title">Administrator sign in</h1>
        <p>This secure area is separate from contributor accounts. Admin accounts are provisioned privately; public registration is disabled.</p>
        <form onSubmit={submit}>
          <label>
            Administrator email
            <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={128} />
          </label>
          {error && <div className="errorBox" role="alert">{error}</div>}
          <button className="button" disabled={loading}>{loading ? "Verifying…" : "Secure sign in"}</button>
        </form>
        <p className="authFooter"><a href="/">Return to public website</a></p>
      </section>
    </main>
  );
}
