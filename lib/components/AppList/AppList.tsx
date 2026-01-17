"use client";

import { useState, useEffect, useRef } from "react";
import Row from "../Row";
import AppView from "../AppView/AppView";
import Toast from "../Toast";
import ConfirmModal from "../ConfirmModal";
import Badge from "../Badge/Badge";
import styles from "./AppList.module.css";

interface Widget {
  id: string;
  name: string;
  description: string;
  target: "home" | "user-settings" | "system-settings";
  component: string;
  appId: string;
}

interface AppVersion {
  major: number;
  minor: number;
  dev: number;
}

interface App {
  id: string;
  label: string;
  version: AppVersion;
  author: string;
  contactEmail: string;
  description: string;
  widgets?: Widget[];
  dependencies?: Record<string, AppVersion>;
}

function formatVersion(version: AppVersion): string {
  return `${version.major}.${version.minor}.${version.dev}`;
}

function canUninstallApp(
  appId: string,
  apps: App[]
): { canUninstall: boolean; dependents: string[] } {
  const dependentApps = apps.filter(
    (app) =>
      app.id !== appId &&
      app.dependencies &&
      Object.keys(app.dependencies).includes(appId)
  );

  return {
    canUninstall: dependentApps.length === 0,
    dependents: dependentApps.map((app) => app.label),
  };
}

export default function AppList() {
  const [apps, setApps] = useState<App[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [installing, setInstalling] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upgradeFileInputRef = useRef<HTMLInputElement>(null);
  const [upgradeAppId, setUpgradeAppId] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<{
    appId: string;
    appName: string;
  } | null>(null);
  const [upgradingSystem, setUpgradingSystem] = useState(false);
  const [systemNeedsUpgrade, setSystemNeedsUpgrade] = useState(false);

  const fetchApps = async () => {
    try {
      const response = await fetch("/api/system/apps");
      const data = await response.json();
      setApps(data.apps || []);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    }
  };

  const checkSystemVersion = async () => {
    try {
      const response = await fetch("/api/system/settings");
      const data = await response.json();
      setSystemNeedsUpgrade(data.version?.isUpgradeable || false);
    } catch (error) {
      console.error("Failed to check system version:", error);
    }
  };

  useEffect(() => {
    fetchApps();
    checkSystemVersion();
  }, []);

  const handleInstallClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setInstalling(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/system/apps/install", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: `App "${data.name}" installed successfully!`,
          type: "success",
        });
        await fetchApps();
      } else {
        setToast({
          message: data.error || "Failed to install app",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error installing app:", error);
      setToast({ message: "Failed to install app", type: "error" });
    } finally {
      setInstalling(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpgradeClick = (appId: string) => {
    setUpgradeAppId(appId);
    upgradeFileInputRef.current?.click();
  };

  const handleUpgradeFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !upgradeAppId) return;

    const appToUpgrade = apps.find((a) => a.id === upgradeAppId);
    setUpgrading(upgradeAppId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("appId", upgradeAppId);

      const response = await fetch("/api/system/apps/upgrade", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: `App "${data.name}" upgraded successfully from v${data.oldVersion} to v${data.newVersion}!`,
          type: "success",
        });
        await fetchApps();
      } else {
        setToast({
          message: data.error || "Failed to upgrade app",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error upgrading app:", error);
      setToast({ message: "Failed to upgrade app", type: "error" });
    } finally {
      setUpgrading(null);
      setUpgradeAppId(null);
      if (upgradeFileInputRef.current) {
        upgradeFileInputRef.current.value = "";
      }
    }
  };

  const handleUninstallClick = (appId: string, appName: string) => {
    setConfirmUninstall({ appId, appName });
  };

  const handleUninstall = async () => {
    if (!confirmUninstall) return;

    const { appId, appName } = confirmUninstall;
    setConfirmUninstall(null);
    setUninstalling(appId);

    try {
      const response = await fetch("/api/system/apps/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: "App uninstalled successfully!", type: "success" });
        await fetchApps();
      } else {
        setToast({
          message: data.error || "Failed to uninstall app",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error uninstalling app:", error);
      setToast({ message: "Failed to uninstall app", type: "error" });
    } finally {
      setUninstalling(null);
    }
  };

  const handleSystemUpgrade = async () => {
    setUpgradingSystem(true);
    try {
      // Use the main upgrade endpoint with appId for system
      const formData = new FormData();
      formData.append("appId", "system");

      const response = await fetch("/api/system/apps/upgrade", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: `System upgraded successfully from v${data.oldVersion} to v${data.newVersion}!`,
          type: "success",
        });
        await fetchApps();
        await checkSystemVersion();
      } else {
        setToast({
          message: data.error || "Failed to upgrade system",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error upgrading system:", error);
      setToast({ message: "Failed to upgrade system", type: "error" });
    } finally {
      setUpgradingSystem(false);
    }
  };

  const filteredApps = apps.filter(
    (app) =>
      app.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If an app is selected, show the AppView
  if (selectedAppId) {
    return (
      <AppView appId={selectedAppId} onBack={() => setSelectedAppId(null)} />
    );
  }

  return (
    <div className={styles.container}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmUninstall && (
        <ConfirmModal
          title="Uninstall App"
          message={`Are you sure you want to uninstall "${confirmUninstall.appName}"? This will delete all app data, authorizations, and remove it from all authorities.`}
          confirmText="Uninstall"
          cancelText="Cancel"
          onConfirm={handleUninstall}
          onCancel={() => setConfirmUninstall(null)}
          danger
        />
      )}

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className={styles.installButton}
        >
          {installing ? "Installing..." : "+ Install App"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <input
          ref={upgradeFileInputRef}
          type="file"
          accept=".zip"
          onChange={handleUpgradeFileChange}
          style={{ display: "none" }}
        />
      </div>

      <div className={styles.appList}>
        {filteredApps.map((app) => (
          <Row key={app.id}>
            <div
              className={styles.appInfo}
              onClick={() => setSelectedAppId(app.id)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.iconPlaceholder}>
                <span style={{ position: "absolute" }}>
                  {(app.label || "U").charAt(0).toUpperCase()}
                </span>
                <img
                  src={`/api/${app.id}/assets/icon`}
                  alt={app.label}
                  onError={(e) => {
                    // If image fails to load, hide it to show the fallback letter
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                  onLoad={(e) => {
                    // If image loads successfully, hide the fallback letter
                    const target = e.target as HTMLImageElement;
                    const sibling =
                      target.previousElementSibling as HTMLElement;
                    if (sibling) {
                      sibling.style.display = "none";
                    }
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              </div>
              <div className={styles.contentColumn}>
                <div className={styles.headerRow}>
                  <div className={styles.appLabel}>
                    {app.label || "Unknown App"}
                  </div>
                  <Badge variant="gray">v{formatVersion(app.version)}</Badge>
                </div>
                <div className={styles.appDescription}>
                  {app.description || "No description"}
                </div>
              </div>
              {app.id === "system" ? (
                <div className={styles.buttonGroup}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSystemUpgrade();
                    }}
                    disabled={upgradingSystem || !systemNeedsUpgrade}
                    className={styles.upgradeButton}
                    title={!systemNeedsUpgrade ? "System is up to date" : ""}
                  >
                    {upgradingSystem
                      ? "Upgrading..."
                      : systemNeedsUpgrade
                      ? "Upgrade"
                      : "Up to Date"}
                  </button>
                </div>
              ) : (
                (() => {
                  const { canUninstall, dependents } = canUninstallApp(
                    app.id,
                    apps
                  );
                  return (
                    <div className={styles.buttonGroup}>
                      {app.widgets &&
                        app.widgets.some(
                          (w) => w.target === "system-settings"
                        ) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const systemWidget = app.widgets!.find(
                                (w) => w.target === "system-settings"
                              );
                              if (systemWidget) {
                                window.location.href = `/system/settings/applet/${systemWidget.id}`;
                              }
                            }}
                            className={styles.settingsButton}
                          >
                            Settings
                          </button>
                        )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpgradeClick(app.id);
                        }}
                        disabled={upgrading === app.id}
                        className={styles.upgradeButton}
                      >
                        {upgrading === app.id ? "Upgrading..." : "Upgrade"}
                      </button>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canUninstall) {
                              handleUninstallClick(app.id, app.label);
                            }
                          }}
                          disabled={uninstalling === app.id || !canUninstall}
                          className={styles.uninstallButton}
                          title={
                            !canUninstall
                              ? `Required by: ${dependents.join(", ")}`
                              : ""
                          }
                        >
                          {uninstalling === app.id
                            ? "Uninstalling..."
                            : "Uninstall"}
                        </button>
                        {!canUninstall && (
                          <span
                            style={{
                              position: "absolute",
                              top: "-2px",
                              right: "-8px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              background: "#3b82f6",
                              color: "#f1f5f9",
                              fontSize: "11px",
                              fontWeight: "bold",
                              cursor: "help",
                              border: "2px solid #1e293b",
                            }}
                            title={`Cannot uninstall: Required by ${dependents.join(
                              ", "
                            )}`}
                          >
                            i
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </Row>
        ))}

        {filteredApps.length === 0 && (
          <div className={styles.emptyState}>No apps found</div>
        )}
      </div>
    </div>
  );
}
