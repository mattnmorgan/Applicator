import React, { useState, useEffect } from "react";

const API_BASE = "/api/demo";

// Predefined color options
const COLOR_OPTIONS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Green", value: "#22C55E" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
];

export default function SystemSettingsWidget() {
  const [color, setColor] = useState<string>("#6366F1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadColor();
  }, []);

  async function loadColor() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/system-color`);
      if (response.ok) {
        const data = await response.json();
        if (data.color) {
          setColor(data.color);
        }
      }
    } catch (err) {
      console.error("Error loading system color:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_BASE}/settings/system-color`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save system color");
      }
    } catch (err) {
      console.error("Error saving system color:", err);
      setError("Failed to save system color");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1
        style={{
          color: "#f1f5f9",
          fontSize: "24px",
          fontWeight: "700",
          marginBottom: "8px",
        }}
      >
        Demo System Color Settings
      </h1>
      <p
        style={{
          color: "#94a3b8",
          fontSize: "14px",
          marginBottom: "24px",
        }}
      >
        Configure the system-wide color preference (Admin only, stored in database)
      </p>

      <div
        style={{
          background: "#0f172a",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            color: "#f1f5f9",
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "16px",
          }}
        >
          System Color
        </h2>

        {loading ? (
          <div style={{ color: "#94a3b8" }}>Loading...</div>
        ) : (
          <>
            {/* Color Preview */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "8px",
                  background: color,
                  border: "2px solid #334155",
                }}
              />
              <div>
                <div style={{ color: "#f1f5f9", fontWeight: "500" }}>
                  System Default Color
                </div>
                <div style={{ color: "#94a3b8", fontSize: "14px" }}>{color}</div>
                <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>
                  This color is shared across all users
                </div>
              </div>
            </div>

            {/* Color Picker */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Pick a color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  height: "50px",
                  padding: "4px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Preset Colors */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Or choose a preset
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setColor(option.value)}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "6px",
                      background: option.value,
                      border:
                        color === option.value
                          ? "3px solid #f1f5f9"
                          : "2px solid #334155",
                      cursor: "pointer",
                      transition: "transform 0.1s",
                    }}
                    title={option.name}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Warning */}
      <div
        style={{
          background: "#fef3c7",
          border: "1px solid #fbbf24",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
          }}
        >
          <div
            style={{
              color: "#f59e0b",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3
              style={{
                color: "#92400e",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              System-wide Setting
            </h3>
            <p
              style={{
                color: "#92400e",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              This color setting is stored in the database and shared across all
              users. Changes here will affect the entire system.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "#fca5a5",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            padding: "10px 20px",
            background: saving ? "#1e40af" : "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: saving || loading ? "not-allowed" : "pointer",
            opacity: saving || loading ? 0.7 : 1,
            transition: "background 0.2s",
          }}
        >
          {saving ? "Saving..." : "Save System Color"}
        </button>

        {saved && (
          <span
            style={{
              color: "#34d399",
              fontSize: "14px",
            }}
          >
            ✓ System color saved to database
          </span>
        )}
      </div>
    </div>
  );
}
