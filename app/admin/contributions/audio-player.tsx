"use client";

import { useState } from "react";

export default function AdminAudioPlayer({ audioId, mimeType, storageStatus }: { audioId: string; mimeType: string; storageStatus: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAudio() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/audio/${encodeURIComponent(audioId)}/playback`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to load audio.");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("Network error while requesting audio playback.");
    } finally {
      setLoading(false);
    }
  }

  if (storageStatus !== "READY") {
    return <span className="mutedLine">{mimeType} · {storageStatus} · Not playable yet</span>;
  }

  return (
    <div className="adminAudioPlayer">
      {!url ? <button type="button" className="button buttonGhost buttonSmall" onClick={loadAudio} disabled={loading}>{loading ? "Loading audio…" : "Play audio"}</button> : <audio controls preload="none" src={url} />}
      {url && <button type="button" className="textButton" onClick={() => setUrl("")}>Close player</button>}
      {error && <p className="errorBox" role="alert">{error}</p>}
      <span className="mutedLine">{mimeType} · Secure link expires after 5 minutes</span>
    </div>
  );
}
