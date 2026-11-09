"use client";

import { useState } from "react";

type Decision = "VALIDATED" | "NEEDS_CORRECTION" | "REJECTED" | "DUPLICATE";

export default function ModerationActions({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(decision: Decision) {
    if (decision !== "VALIDATED" && !note.trim()) {
      setMessage("Add a note explaining this decision first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/contributions/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to save this decision.");
        return;
      }
      window.location.reload();
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="moderationPanel">
      <label className="moderationNote">Review note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={1000} placeholder="Required for correction, rejection, or duplicate decisions." />
      </label>
      <div className="reviewActions">
        <button className="button" disabled={busy || currentStatus === "VALIDATED"} onClick={() => decide("VALIDATED")}>Approve / validate</button>
        <button className="button buttonGhost" disabled={busy} onClick={() => decide("NEEDS_CORRECTION")}>Return for correction</button>
        <button className="button buttonGhost dangerButton" disabled={busy} onClick={() => decide("REJECTED")}>Reject</button>
        <button className="button buttonGhost" disabled={busy} onClick={() => decide("DUPLICATE")}>Mark duplicate</button>
      </div>
      {message && <p className="errorBox" role="alert">{message}</p>}
    </div>
  );
}
