"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to sign in.");
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard" aria-labelledby="login-title">
        <div className="sectionLabel">KHOWAR DATASET</div>
        <h1 id="login-title">Sign in</h1>
        <p>Access your contributor workspace.</p>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
              required
            />
          </label>

          {error && <div className="errorBox" role="alert">{error}</div>}
          <button className="button" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="authFooter">
          New contributor? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
