"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type RegistrationForm = {
  displayName: string;
  username: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const [form, setForm] = useState<RegistrationForm>({
    displayName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          username: form.username.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to create your account.");
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
      <section className="authCard" aria-labelledby="register-title">
        <div className="sectionLabel">CONTRIBUTOR ACCOUNT</div>
        <h1 id="register-title">Create your account</h1>
        <p>Start preserving Khowar with accountable, traceable contributions.</p>

        <form onSubmit={submit}>
          <label>
            Display name
            <input
              autoComplete="name"
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Username <span>(optional)</span>
            <input
              autoComplete="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_]+"
              title="Use 3–32 letters, numbers, or underscores."
            />
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              maxLength={254}
              required
            />
          </label>
          <label>
            Password <span>(10–128 characters)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              minLength={10}
              maxLength={128}
              required
            />
          </label>

          {error && <div className="errorBox" role="alert">{error}</div>}
          <button className="button" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="authFooter">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
