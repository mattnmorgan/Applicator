"use client";

import { useState, useEffect } from "react";
import Button from "@/lib/components/utility/Button";
import Banner from "@/lib/components/utility/Banner";

interface TopicRow {
  id: string;
  appId: string;
  appName: string;
  name: string;
  summary: string;
  internal: boolean;
  external: boolean;
}

interface GroupedApp {
  appId: string;
  appName: string;
  topics: TopicRow[];
}

export default function NotificationsPage() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [hasUuid, setHasUuid] = useState(false);
  const [ntfyConfigured, setNtfyConfigured] = useState(false);
  const [uuid, setUuid] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ntfyRes, topicsRes] = await Promise.all([
        fetch("/api/system/settings/user/ntfy"),
        fetch("/api/system/settings/user/notification-preferences"),
      ]);

      if (!ntfyRes.ok || !topicsRes.ok) throw new Error("Failed to fetch");

      const ntfyData = await ntfyRes.json();
      const topicsData = await topicsRes.json();

      setHasUuid(ntfyData.hasUuid);
      setNtfyConfigured(ntfyData.ntfyConfigured);
      setTopics(topicsData.topics || []);
    } catch {
      setError("Failed to load notification settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (
    topicId: string,
    channel: "internal" | "external",
    newValue: boolean,
  ) => {
    setSaving(topicId + ":" + channel);
    setError("");
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    const patch = {
      topicId,
      internal: channel === "internal" ? newValue : topic.internal,
      external: channel === "external" ? newValue : topic.external,
    };

    try {
      const res = await fetch(
        "/api/system/settings/user/notification-preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) throw new Error("Save failed");
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId ? { ...t, [channel]: newValue } : t,
        ),
      );
    } catch {
      setError("Failed to save preference. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/system/settings/user/ntfy/test", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      setSuccess("Test notification sent. Check your NTFY app.");
    } catch (err: any) {
      setError(err.message || "Failed to send test notification.");
    } finally {
      setTestSending(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/system/settings/user/ntfy", {
        method: "POST",
      });
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

  // Group topics by app
  const grouped: GroupedApp[] = [];
  for (const topic of topics) {
    let group = grouped.find((g) => g.appId === topic.appId);
    if (!group) {
      group = { appId: topic.appId, appName: topic.appName, topics: [] };
      grouped.push(group);
    }
    group.topics.push(topic);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
          Notifications
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%", paddingBottom: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
        Notifications
      </h2>

      {error && <Banner variant="error">{error}</Banner>}
      {success && <Banner variant="success">{success}</Banner>}

      {/* ── Per-topic preferences ─────────────────────────────────────── */}
      {grouped.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 4px" }}>
              Notification Preferences
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
              Choose which notifications you receive and how they are delivered.
              <strong style={{ color: "#cbd5e1" }}> Internal</strong> shows a bell
              notification in the app.
              <strong style={{ color: "#cbd5e1" }}> External</strong> pushes to your NTFY
              device.
            </p>
          </div>

          {grouped.map((group) => (
            <div key={group.appId} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {group.appName}
              </div>

              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 90px",
                  gap: "8px",
                  padding: "6px 14px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>Topic</span>
                <span style={{ textAlign: "center" }}>Internal</span>
                <span style={{ textAlign: "center" }}>External</span>
              </div>

              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {group.topics.map((topic, idx) => (
                  <div
                    key={topic.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 90px",
                      gap: "8px",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderTop: idx > 0 ? "1px solid #1e293b" : undefined,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: 500 }}>
                        {topic.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {topic.summary}
                      </div>
                    </div>

                    {/* Internal toggle */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Toggle
                        checked={topic.internal}
                        disabled={saving === topic.id + ":internal"}
                        onChange={(v) => handleToggle(topic.id, "internal", v)}
                      />
                    </div>

                    {/* External toggle */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Toggle
                        checked={topic.external}
                        disabled={
                          !ntfyConfigured ||
                          saving === topic.id + ":external"
                        }
                        title={
                          !ntfyConfigured
                            ? "NTFY is not configured by your administrator"
                            : undefined
                        }
                        onChange={(v) => handleToggle(topic.id, "external", v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── NTFY setup ────────────────────────────────────────────────── */}
      {!ntfyConfigured && (
        <Banner variant="info">
          NTFY is not configured. Ask your administrator to set up a NTFY server
          in System Settings before you can receive push notifications.
        </Banner>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
          NTFY Push Setup
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
            Download the <strong style={{ color: "#cbd5e1" }}>NTFY</strong> app on your
            device — available for Android, iOS, and as a web app at{" "}
            <span style={{ color: "#3b82f6" }}>ntfy.sh</span>.
          </li>
          <li>
            Open the app and subscribe to a topic using your{" "}
            <strong style={{ color: "#cbd5e1" }}>server URL</strong> and your{" "}
            <strong style={{ color: "#cbd5e1" }}>notification topic</strong> shown below
            after generating.
          </li>
          <li>
            Click <strong style={{ color: "#cbd5e1" }}>Generate UUID</strong> below to
            get your personal topic. Each user has a unique topic so notifications are
            delivered only to you.
          </li>
        </ol>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {hasUuid && !uuid && (
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              You have an active notification UUID. Click{" "}
              <strong style={{ color: "#cbd5e1" }}>Regenerate</strong> to replace it.
              Your previous subscriptions will receive a revocation notice.
            </p>
          )}

          {!hasUuid && !uuid && (
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              You have not generated a notification topic yet. Click{" "}
              <strong style={{ color: "#cbd5e1" }}>Generate UUID</strong> to create one.
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
            {hasUuid && ntfyConfigured && (
              <Button
                variant="secondary"
                onClick={handleSendTest}
                disabled={testSending}
              >
                {testSending ? "Sending..." : "Send Test Notification"}
              </Button>
            )}
            {hasUuid && (
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Regenerating will revoke your current topic and notify existing
                subscribers.
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (value: boolean) => void;
}

function Toggle({ checked, disabled, title, onChange }: ToggleProps) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: "38px",
        height: "22px",
        borderRadius: "11px",
        border: "none",
        background: checked ? "#3b82f6" : "#334155",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: checked ? "19px" : "3px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#f1f5f9",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}
