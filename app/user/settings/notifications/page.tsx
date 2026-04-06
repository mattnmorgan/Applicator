"use client";

import { useState, useEffect } from "react";
import Button from "@/lib/components/utility/Button";
import Banner from "@/lib/components/utility/Banner";

export default function NotificationsPage() {
  const [hasUuid, setHasUuid] = useState(false);
  const [ntfyConfigured, setNtfyConfigured] = useState(false);
  const [uuid, setUuid] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchNtfyInfo();
  }, []);

  const fetchNtfyInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/settings/user/ntfy");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setHasUuid(data.hasUuid);
      setNtfyConfigured(data.ntfyConfigured);
      setUuid(null); // UUID is only revealed after regeneration
    } catch {
      setError("Failed to load notification settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/system/settings/user/ntfy", { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      setUuid(data.uuid);
      setHasUuid(true);
      setSuccess("UUID regenerated. Copy the topic shown below into your NTFY app.");
    } catch {
      setError("Failed to regenerate UUID. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
            Notifications
          </h2>
        </div>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", paddingBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
          Notifications
        </h2>
      </div>

      {!ntfyConfigured && (
        <Banner variant="info">
          NTFY is not configured. Ask your administrator to set up a NTFY server in System Settings before you can receive push notifications.
        </Banner>
      )}

      {error && <Banner variant="error">{error}</Banner>}

      {success && <Banner variant="success">{success}</Banner>}

      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
          Setup Instructions
        </h3>
        <ol
          style={{
            color: "#94a3b8",
            fontSize: "14px",
            lineHeight: "1.8",
            margin: 0,
            paddingLeft: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <li>
            Download the <strong style={{ color: "#cbd5e1" }}>NTFY</strong> app on your device —
            available for Android, iOS, and as a web app at{" "}
            <span style={{ color: "#3b82f6" }}>ntfy.sh</span>.
          </li>
          <li>
            Open the app and add your server: tap <strong style={{ color: "#cbd5e1" }}>Subscribe to topic</strong> or the{" "}
            <strong style={{ color: "#cbd5e1" }}>+</strong> button.
          </li>
          <li>
            Enter the <strong style={{ color: "#cbd5e1" }}>server URL</strong> configured by your administrator and your{" "}
            <strong style={{ color: "#cbd5e1" }}>notification topic</strong> (shown below after generating).
          </li>
          <li>
            If your server requires authentication, enter your NTFY server credentials in the app settings.
          </li>
          <li>
            Click <strong style={{ color: "#cbd5e1" }}>Generate UUID</strong> below to get your personal topic. Each user has a unique topic so notifications are delivered only to you.
          </li>
        </ol>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
          Your Notification Topic
        </h3>

        {hasUuid && !uuid && (
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            You have an active notification UUID. Click <strong style={{ color: "#cbd5e1" }}>Regenerate</strong> to
            replace it with a new one. Your previous subscriptions will receive a revocation notice.
          </p>
        )}

        {!hasUuid && !uuid && (
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            You have not generated a notification topic yet. Click <strong style={{ color: "#cbd5e1" }}>Generate UUID</strong> to create one.
          </p>
        )}

        {uuid && (
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
              Your topic — subscribe to this in your NTFY app:
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <code
                style={{
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: "14px",
                  color: "#f1f5f9",
                  wordBreak: "break-all",
                }}
              >
                {uuid}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(uuid)}
                title="Copy to clipboard"
                style={{
                  background: "transparent",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "12px",
                  flexShrink: 0,
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            variant={hasUuid ? "secondary" : "primary"}
            onClick={handleRegenerate}
            disabled={regenerating || !ntfyConfigured}
          >
            {regenerating
              ? "Regenerating..."
              : hasUuid
              ? "Regenerate UUID"
              : "Generate UUID"}
          </Button>
          {hasUuid && (
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Regenerating will revoke your current topic and notify existing subscribers.
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
