"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FolderBrowser from "@/lib/components/utility/FolderBrowser";
import ToastStack, { ToastItem } from "@/lib/components/utility/Toast";
import Button from "@/lib/components/utility/Button";
export default function SettingsPage() {
  const router = useRouter();
  const [storage, setStorage] = useState("");
  const [originalStorage, setOriginalStorage] = useState("");
  const [brandName, setBrandName] = useState("");
  const [originalBrandName, setOriginalBrandName] = useState("");
  const [brandIcon, setBrandIcon] = useState<File | null>(null);
  const [brandIconPreview, setBrandIconPreview] = useState<string>("");
  const [clearBrandIcon, setClearBrandIcon] = useState(false);
  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [originalLoggingEnabled, setOriginalLoggingEnabled] = useState(false);
  const [selfregistrationEnabled, setSelfregistrationEnabled] = useState(false);
  const [originalSelfregistrationEnabled, setOriginalSelfregistrationEnabled] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [originalSiteUrl, setOriginalSiteUrl] = useState("");
  const [ntfyServerUrl, setNtfyServerUrl] = useState("");
  const [originalNtfyServerUrl, setOriginalNtfyServerUrl] = useState("");
  const [ntfyUsername, setNtfyUsername] = useState("");
  const [originalNtfyUsername, setOriginalNtfyUsername] = useState("");
  const [ntfyPassword, setNtfyPassword] = useState("");
  const [ntfyPasswordSet, setNtfyPasswordSet] = useState(false);
  const [elasticsearchUrl, setElasticsearchUrl] = useState("");
  const [originalElasticsearchUrl, setOriginalElasticsearchUrl] = useState("");
  const [elasticsearchUsername, setElasticsearchUsername] = useState("");
  const [originalElasticsearchUsername, setOriginalElasticsearchUsername] = useState("");
  const [elasticsearchPassword, setElasticsearchPassword] = useState("");
  const [elasticsearchPasswordSet, setElasticsearchPasswordSet] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
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

      setStorage(settings.storage || "");
      setOriginalStorage(settings.storage || "");

      setBrandName(settings.brandName || "Applicator");
      setOriginalBrandName(settings.brandName || "Applicator");
      if (settings.brandIcon) {
        setBrandIconPreview(`/api/system/assets/brand?t=${Date.now()}`);
      }

      setLoggingEnabled(settings.loggingEnabled === "true");
      setOriginalLoggingEnabled(settings.loggingEnabled === "true");

      setSelfregistrationEnabled(settings.selfregistrationEnabled === "true");
      setOriginalSelfregistrationEnabled(settings.selfregistrationEnabled === "true");

      setSiteUrl(settings.siteUrl || "");
      setOriginalSiteUrl(settings.siteUrl || "");
      setNtfyServerUrl(settings.ntfyServerUrl || "");
      setOriginalNtfyServerUrl(settings.ntfyServerUrl || "");
      setNtfyUsername(settings.ntfyUsername || "");
      setOriginalNtfyUsername(settings.ntfyUsername || "");
      setNtfyPasswordSet(settings.ntfyPasswordSet === "true");
      setNtfyPassword(""); // Never pre-fill password
      setElasticsearchUrl(settings.elasticsearchUrl || "");
      setOriginalElasticsearchUrl(settings.elasticsearchUrl || "");
      setElasticsearchUsername(settings.elasticsearchUsername || "");
      setOriginalElasticsearchUsername(settings.elasticsearchUsername || "");
      setElasticsearchPasswordSet(settings.elasticsearchPasswordSet === "true");
      setElasticsearchPassword(""); // Never pre-fill password
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleBrandIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandIcon(file);
      setClearBrandIcon(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearBrandIcon = () => {
    setBrandIcon(null);
    setBrandIconPreview("");
    setClearBrandIcon(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If there's a brand icon to upload or clear, use FormData
      if (brandIcon || clearBrandIcon) {
        const brandFormData = new FormData();
        brandFormData.append("brandName", brandName);

        if (brandIcon) {
          brandFormData.append("brandIcon", brandIcon);
        }

        if (clearBrandIcon) {
          brandFormData.append("clearBrandIcon", "true");
        }

        const brandResponse = await fetch("/api/system/settings", {
          method: "POST",
          body: brandFormData,
        });

        if (!brandResponse.ok) {
          addToast({ message: "Failed to save brand settings", type: "error" });
          return;
        }
      }

      // Save other settings via JSON
      const settingsBody: Record<string, unknown> = {
        storage,
        siteUrl,
        loggingEnabled,
        selfregistrationEnabled,
        ntfyServerUrl,
        ntfyUsername,
        elasticsearchUrl,
        elasticsearchUsername,
        ...(!brandIcon && !clearBrandIcon && { brandName }),
      };

      // Only send passwords if the user entered new ones
      if (ntfyPassword) {
        settingsBody.ntfyPassword = ntfyPassword;
      }
      if (elasticsearchPassword) {
        settingsBody.elasticsearchPassword = elasticsearchPassword;
      }

      const settingsResponse = await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsBody),
      });

      if (settingsResponse.ok) {
        setOriginalStorage(storage);
        setOriginalBrandName(brandName);
        setOriginalLoggingEnabled(loggingEnabled);
        setOriginalSelfregistrationEnabled(selfregistrationEnabled);
        setOriginalSiteUrl(siteUrl);
        setOriginalNtfyServerUrl(ntfyServerUrl);
        setOriginalNtfyUsername(ntfyUsername);
        setNtfyPassword("");
        setOriginalElasticsearchUrl(elasticsearchUrl);
        setOriginalElasticsearchUsername(elasticsearchUsername);
        setElasticsearchPassword("");
        setBrandIcon(null);
        setClearBrandIcon(false);
        addToast({ message: "Settings saved successfully", type: "success" });

        // Refetch settings to update UI
        await fetchSettings();

        // Refresh to update navigation
        setTimeout(() => {
          router.refresh();
        }, 500);
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

  const hasChanges =
    storage !== originalStorage ||
    brandName !== originalBrandName ||
    brandIcon !== null ||
    clearBrandIcon ||
    loggingEnabled !== originalLoggingEnabled ||
    selfregistrationEnabled !== originalSelfregistrationEnabled ||
    siteUrl !== originalSiteUrl ||
    ntfyServerUrl !== originalNtfyServerUrl ||
    ntfyUsername !== originalNtfyUsername ||
    ntfyPassword !== "" ||
    elasticsearchUrl !== originalElasticsearchUrl ||
    elasticsearchUsername !== originalElasticsearchUsername ||
    elasticsearchPassword !== "";

  return (
    <div style={{ paddingBottom: "24px" }}>
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
          Settings
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

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Brand section */}
        <section
          style={{
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
            Brand
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 200px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Applicator"
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  width: "100%",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
              />
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                The brand name shown in the navigation bar
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Brand Icon
              </label>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {brandIconPreview && (
                  <div
                    onClick={handleClearBrandIcon}
                    style={{
                      position: "relative",
                      width: "64px",
                      height: "64px",
                      borderRadius: "6px",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: "1px solid #475569",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={brandIconPreview}
                      alt="Brand icon preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#1e293b",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0,
                        transition: "opacity 0.2s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = "0")}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M6 6L18 18M6 18L18 6"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBrandIconChange}
                    style={{ display: "none" }}
                    id="brandIcon"
                  />
                  <label
                    htmlFor="brandIcon"
                    style={{
                      display: "inline-block",
                      padding: "10px 20px",
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#2563eb")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#3b82f6")}
                  >
                    {brandIcon ? brandIcon.name : "Choose file"}
                  </label>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                The brand icon shown in the navigation bar (optional)
              </p>
            </div>
          </div>
        </section>

        {/* System section */}
        <section
          style={{
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
            System
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
              System Storage
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                type="text"
                value={storage}
                disabled
                placeholder="No storage path selected"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#94a3b8",
                  fontSize: "14px",
                  outline: "none",
                  cursor: "not-allowed",
                }}
              />
              <Button variant="primary" onClick={() => setIsBrowserOpen(true)}>
                Browse
              </Button>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Select a folder where system files will be stored
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 200px" }}>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={loggingEnabled}
                  onChange={(e) => setLoggingEnabled(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3b82f6" }}
                />
                Enable Logging
              </label>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                When enabled, system and application logs will be captured for debugging. Disabling will clear all existing logs.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 200px" }}>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={selfregistrationEnabled}
                  onChange={(e) => setSelfregistrationEnabled(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3b82f6" }}
                />
                Enable Self-registration
              </label>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                When enabled, users can create their own account from the login page.
              </p>
            </div>
          </div>
        </section>

        {/* NTFY section */}
        <section
          style={{
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 4px" }}>
              NTFY
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Configure a self-hosted NTFY server to send push notifications to users.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
              Site URL
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://your-site.example.com"
              style={{
                padding: "10px 12px",
                background: "#0f172a",
                border: "1px solid #475569",
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
                width: "100%",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
            />
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              The public base URL of this site (e.g. <code style={{ color: "#94a3b8" }}>https://your-site.example.com</code>). Used to include the brand icon in push notifications.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "2 1 240px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Server URL
              </label>
              <input
                type="text"
                value={ntfyServerUrl}
                onChange={(e) => setNtfyServerUrl(e.target.value)}
                placeholder="https://ntfy.example.com"
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 160px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Username
              </label>
              <input
                type="text"
                value={ntfyUsername}
                onChange={(e) => setNtfyUsername(e.target.value)}
                placeholder="ntfy-username"
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 160px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Password
              </label>
              <input
                type="password"
                value={ntfyPassword}
                onChange={(e) => setNtfyPassword(e.target.value)}
                placeholder={ntfyPasswordSet ? "(configured — enter to change)" : "Enter password"}
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
              />
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Leave blank to keep the existing password.
              </p>
            </div>
          </div>
        </section>

        {/* Elasticsearch section */}
        <section
          style={{
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 4px" }}>
              Elasticsearch
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Connect to an Elasticsearch server to enable full-text search and indexing for applets.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "2 1 240px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Server URL
              </label>
              <input
                type="text"
                value={elasticsearchUrl}
                onChange={(e) => setElasticsearchUrl(e.target.value)}
                placeholder="https://elasticsearch.example.com:9200"
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 160px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Username
              </label>
              <input
                type="text"
                value={elasticsearchUsername}
                onChange={(e) => setElasticsearchUsername(e.target.value)}
                placeholder="elastic"
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 160px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                Password
              </label>
              <input
                type="password"
                value={elasticsearchPassword}
                onChange={(e) => setElasticsearchPassword(e.target.value)}
                placeholder={elasticsearchPasswordSet ? "(configured — enter to change)" : "Enter password"}
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
              />
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Leave blank to keep the existing password.
              </p>
            </div>
          </div>
        </section>

      </div>

      <FolderBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onConfirm={(path) => setStorage(path)}
        initialPath={storage}
      />

      <ToastStack
        toasts={toasts}
        onClose={(i) => setToasts((prev) => prev.filter((_, idx) => idx !== i))}
      />
    </div>
  );
}
