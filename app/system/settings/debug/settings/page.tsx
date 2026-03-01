"use client";

import { useState, useEffect } from "react";
import ToastStack, { ToastItem } from "@/lib/components/utility/Toast";
import Button from "@/lib/components/utility/Button";
import DynamicInput from "@/lib/components/utility/DynamicInput";

export default function DevelopmentSettingsPage() {
  const [appInplaceEnabled, setAppInplaceEnabled] = useState(false);
  const [originalAppInplaceEnabled, setOriginalAppInplaceEnabled] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = (toast: ToastItem) => setToasts((prev) => [...prev, toast]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/system/settings");
      const data = await response.json();
      const settings = data.settings;

      const enabled = settings.appInplaceEnabled === "true";
      setAppInplaceEnabled(enabled);
      setOriginalAppInplaceEnabled(enabled);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appInplaceEnabled }),
      });

      if (response.ok) {
        setOriginalAppInplaceEnabled(appInplaceEnabled);
        addToast({ message: "Settings saved successfully", type: "success" });
      } else {
        addToast({ message: "Failed to save settings", type: "error" });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      addToast({ message: "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = appInplaceEnabled !== originalAppInplaceEnabled;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            margin: 0,
            color: "#f1f5f9",
          }}
        >
          Development Settings
        </h1>

        <Button
          variant="success"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M11 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V5L11 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 2V5H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 9H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: "600px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <DynamicInput
            input={{
              id: "appInplaceEnabled",
              type: "checkbox",
              label: "Enable App In-place Upgrade",
            }}
            value={appInplaceEnabled}
            onChange={(_, val) => setAppInplaceEnabled(val)}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#64748b",
              margin: 0,
            }}
          >
            Enable upgrade of applications to the same version
          </p>
        </div>
      </div>

      <ToastStack
        toasts={toasts}
        onClose={(i) => setToasts((prev) => prev.filter((_, idx) => idx !== i))}
      />
    </div>
  );
}
