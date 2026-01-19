import React, { useState, useEffect } from "react";

const API_BASE = "/api/demo";

interface DemoItem {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: number;
  createdByName: string;
  assignedToName?: string;
}

interface AgentStatus {
  id: string;
  name: string;
  status: "stopped" | "running" | "error";
  lastRun?: number;
  nextRunFormatted?: string;
}

export default function Dashboard() {
  const [items, setItems] = useState<DemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/items/list`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/items/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
        }),
      });

      if (response.ok) {
        await loadItems();
        setNewTitle("");
        setNewDescription("");
        setShowForm(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create item");
      }
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Failed to create item");
    }
  }

  const styles = {
    container: {
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#e2e8f0",
      maxWidth: "1200px",
      margin: "0 auto",
    },
    header: {
      marginBottom: "24px",
    },
    title: {
      fontSize: "24px",
      fontWeight: 600,
      marginBottom: "8px",
    },
    subtitle: {
      color: "#94a3b8",
      fontSize: "14px",
    },
    section: {
      background: "#1e293b",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "20px",
      border: "1px solid #334155",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: 600,
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    featureGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "16px",
    },
    featureCard: {
      background: "#0f172a",
      borderRadius: "6px",
      padding: "16px",
      border: "1px solid #334155",
    },
    featureTitle: {
      fontWeight: 500,
      marginBottom: "8px",
      color: "#f1f5f9",
    },
    featureDescription: {
      fontSize: "13px",
      color: "#94a3b8",
      lineHeight: 1.5,
    },
    badge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 500,
    },
    badgeGreen: {
      background: "#064e3b",
      color: "#34d399",
    },
    badgeBlue: {
      background: "#1e3a5f",
      color: "#60a5fa",
    },
    badgeYellow: {
      background: "#422006",
      color: "#fbbf24",
    },
    button: {
      background: "#3b82f6",
      color: "white",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 500,
    },
    buttonSecondary: {
      background: "transparent",
      color: "#94a3b8",
      border: "1px solid #334155",
      padding: "8px 16px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      background: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      fontSize: "14px",
      marginBottom: "12px",
    },
    itemList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "8px",
    },
    itemRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px",
      background: "#0f172a",
      borderRadius: "6px",
      border: "1px solid #334155",
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "40px",
      color: "#64748b",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Applicator Applet Demo</h1>
        <p style={styles.subtitle}>
          A comprehensive demonstration of the platform's capabilities
        </p>
      </div>

      {/* Features Overview */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>Platform Features Demonstrated</span>
        </div>
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureTitle}>📦 Installation Hooks</div>
            <div style={styles.featureDescription}>
              OnInstall and OnUninstall hooks are triggered during app lifecycle
              events. Check console logs during installation.
            </div>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureTitle}>🗃️ Database Table</div>
            <div style={styles.featureDescription}>
              A demo-item table with various field types: string, date, json,
              picklist, and relationship fields.
            </div>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureTitle}>🔐 Authorities</div>
            <div style={styles.featureDescription}>
              Contextual authority (demo-administrator) and non-contextual
              authority (demo-viewer) with associated authorizations.
            </div>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureTitle}>🤖 Agents</div>
            <div style={styles.featureDescription}>
              Two agents: a CRON-scheduled debug logger (every minute) and a
              continuous ping-pong responder.
            </div>
          </div>
        </div>
      </div>

      {/* Demo Items */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>Demo Items</span>
          <button style={styles.button} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Item"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateItem} style={{ marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button}>
              Create Item
            </button>
          </form>
        )}

        {loading ? (
          <div style={styles.emptyState}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={styles.emptyState}>
            No demo items yet. Create one to see the database in action!
          </div>
        ) : (
          <div style={styles.itemList}>
            {items.map((item) => (
              <div key={item.id} style={styles.itemRow}>
                <div>
                  <div style={{ fontWeight: 500 }}>{item.title}</div>
                  {item.description && (
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Created by {item.createdByName}
                  </div>
                </div>
                <span
                  style={{
                    ...styles.badge,
                    ...(item.status === "active"
                      ? styles.badgeGreen
                      : item.status === "archived"
                      ? styles.badgeYellow
                      : styles.badgeBlue),
                  }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Quick Links</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a
            href="/system/settings/agents"
            style={{
              ...styles.buttonSecondary,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            View Agents →
          </a>
          <a
            href="/system/settings/authorities"
            style={{
              ...styles.buttonSecondary,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            View Authorities →
          </a>
          <a
            href="/system/settings/logs"
            style={{
              ...styles.buttonSecondary,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            View Logs →
          </a>
        </div>
      </div>
    </div>
  );
}
