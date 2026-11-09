"use client";

import { useState } from "react";

export default function UserStatusAction({ userId, status }: { userId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "DEACTIVATED") return <span className="mutedLine">Deactivated account</span>;

  async function changeStatus(nextStatus: "ACTIVE" | "SUSPENDED") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to update account status.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="userStatusActions">
      {status === "ACTIVE"
        ? <button className="button buttonGhost dangerButton" disabled={busy} onClick={() => changeStatus("SUSPENDED")}>Suspend account</button>
        : <button className="button buttonGhost" disabled={busy} onClick={() => changeStatus("ACTIVE")}>Restore account</button>}
      {error && <p className="errorBox" role="alert">{error}</p>}
    </div>
  );
}
