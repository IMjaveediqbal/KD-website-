"use client";

import { useState } from "react";

export default function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/admin/login");
    }
  }

  return <button className="button buttonGhost" type="button" onClick={logout} disabled={loading}>{loading ? "Signing out…" : "Sign out"}</button>;
}
