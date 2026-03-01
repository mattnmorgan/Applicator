"use client";

import { useState, useEffect, useRef } from "react";
import AppView from "../AppView/AppView";
import Row from "@/lib/components/utility/Row";
import ToastStack, { ToastItem } from "@/lib/components/utility/Toast";
import ConfirmModal from "@/lib/components/utility/ConfirmModal";
import Badge from "@/lib/components/utility/Badge/Badge";
import styles from "./AppList.module.css";
import AppManager from "@/lib/client/managers/app";
import ApiRouteManager from "@/lib/client/managers/apiRoute";
import Button from "@/lib/components/utility/Button";

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
  apps: App[],
): { canUninstall: boolean; dependents: string[] } {
  const dependentApps = apps.filter(
    (app) =>
      app.id !== appId &&
      app.dependencies &&
      Object.keys(app.dependencies).includes(appId),
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = (toast: ToastItem) => setToasts((prev) => [...prev, toast]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upgradeFileInputRef = useRef<HTMLInputElement>(null);
  const [upgradeAppId, setUpgradeAppId] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<{
    appId: string;
    appName: string;
  } | null>(null);
  const [pendingInstall, setPendingInstall] = useState<{
    file: File;
    appName: string;
    permissions: { id: string; name: string; description: string }[];
  } | null>(null);
  const [upgradingSystem, setUpgradingSystem] = useState(false);
  const [systemNeedsUpgrade, setSystemNeedsUpgrade] = useState(false);

  const fetchApps = async () => {
    try {
      const appManager = new AppManager();
      const apiRouteManager = new ApiRouteManager();

      // Fetch apps and apiRoutes in parallel
      const [appsData, apiRoutesData] = await Promise.all([
        appManager.readRecords({}),
        apiRouteManager.readRecords({}),
      ]);

      if (appsData.records) {
        // Group API routes by app
        const apiRoutesByApp: Record<string, any[]> = {};
        if (apiRoutesData.records) {
          for (const route of apiRoutesData.records) {
            const appId = route.data.app;
            if (!apiRoutesByApp[appId]) {
              apiRoutesByApp[appId] = [];
            }
            apiRoutesByApp[appId].push({
              path: route.data.path,
              method: route.data.method,
              description: route.data.description,
            });
          }
        }

        // Transform apps with their API routes
        const transformedApps = appsData.records
          .map((record) => ({
            id: record.id,
            label: record.data.label,
            version: record.data.version,
            author: record.data.author,
            contactEmail: record.data.contact_email,
            description: record.data.description,
            dependencies: record.data.dependencies,
            apiRoutes: apiRoutesByApp[record.id] || [],
          }))
          .sort((a: App, b: App) => a.label.localeCompare(b.label));

        setApps(transformedApps);
      }
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
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setInstalling(true);
    try {
      // Preview the app to check for required permissions
      const previewFormData = new FormData();
      previewFormData.append("file", file);

      const previewResponse = await fetch("/api/system/apps/preview", {
        method: "POST",
        body: previewFormData,
      });

      const previewData = await previewResponse.json();

      if (!previewResponse.ok) {
        addToast({
          message: previewData.error || "Failed to preview app",
          type: "error",
          title: "App Install Failed",
          duration: 0,
        });
        setInstalling(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // If the app requires permissions, show the confirmation modal
      if (previewData.permissions && previewData.permissions.length > 0) {
        setPendingInstall({
          file,
          appName: previewData.appName,
          permissions: previewData.permissions,
        });
        setInstalling(false);
        return;
      }

      // No permissions required — install directly
      await performInstall(file);
    } catch (error) {
      console.error("Error installing app:", error);
      addToast({ message: "Failed to install app", type: "error", title: "App Install Failed", duration: 0 });
      setInstalling(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const performInstall = async (file: File, approvedPermissions?: string[]) => {
    setInstalling(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (approvedPermissions && approvedPermissions.length > 0) {
        formData.append(
          "approvedPermissions",
          JSON.stringify(approvedPermissions),
        );
      }

      const response = await fetch("/api/system/apps/install", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        addToast({ message: `App "${data.name}" installed successfully!`, type: "success" });
        await fetchApps();
      } else {
        addToast({ message: data.error || "Failed to install app", type: "error", title: "App Install Failed", duration: 0 });
      }
    } catch (error) {
      console.error("Error installing app:", error);
      addToast({ message: "Failed to install app", type: "error", title: "App Install Failed", duration: 0 });
    } finally {
      setInstalling(false);
      setPendingInstall(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePermissionsConfirm = () => {
    if (!pendingInstall) return;
    const permissionIds = pendingInstall.permissions.map((p) => p.id);
    performInstall(pendingInstall.file, permissionIds);
  };

  const handlePermissionsCancel = () => {
    setPendingInstall(null);
    addToast({ message: "Installation cancelled", type: "error" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpgradeClick = (appId: string) => {
    setUpgradeAppId(appId);
    upgradeFileInputRef.current?.click();
  };

  const handleUpgradeFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
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
        addToast({ message: `App "${data.name}" upgraded successfully from v${data.oldVersion} to v${data.newVersion}!`, type: "success" });
        await fetchApps();
      } else {
        addToast({ message: data.error || "Failed to upgrade app", type: "error", title: "App Upgrade Failed", duration: 0 });
      }
    } catch (error) {
      console.error("Error upgrading app:", error);
      addToast({ message: "Failed to upgrade app", type: "error", title: "App Upgrade Failed", duration: 0 });
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
        addToast({ message: "App uninstalled successfully!", type: "success" });
        await fetchApps();
      } else {
        addToast({ message: data.error || "Failed to uninstall app", type: "error" });
      }
    } catch (error) {
      console.error("Error uninstalling app:", error);
      addToast({ message: "Failed to uninstall app", type: "error" });
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
        addToast({ message: `System upgraded successfully from v${data.oldVersion} to v${data.newVersion}!`, type: "success" });
        await fetchApps();
        await checkSystemVersion();
      } else {
        addToast({ message: data.error || "Failed to upgrade system", type: "error" });
      }
    } catch (error) {
      console.error("Error upgrading system:", error);
      addToast({ message: "Failed to upgrade system", type: "error" });
    } finally {
      setUpgradingSystem(false);
    }
  };

  const filteredApps = apps.filter(
    (app) =>
      app.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // If an app is selected, show the AppView
  if (selectedAppId) {
    return (
      <AppView appId={selectedAppId} onBack={() => setSelectedAppId(null)} />
    );
  }

  return (
    <div className={styles.container}>
      <ToastStack
        toasts={toasts}
        onClose={(i) => setToasts((prev) => prev.filter((_, idx) => idx !== i))}
      />

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

      {pendingInstall && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.2s ease-in-out",
          }}
          onClick={handlePermissionsCancel}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid #334155",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#f1f5f9",
                }}
              >
                App Permissions
              </h2>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
                onClick={handlePermissionsCancel}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div style={{ padding: "24px" }}>
              <p
                style={{
                  margin: "0 0 16px 0",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                <strong>{pendingInstall.appName}</strong> requires the following
                permissions:
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {pendingInstall.permissions.map((perm) => (
                  <div
                    key={perm.id}
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      padding: "12px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#f1f5f9",
                        marginBottom: "4px",
                      }}
                    >
                      {perm.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                      }}
                    >
                      {perm.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
                padding: "16px 24px",
                borderTop: "1px solid #334155",
              }}
            >
              <Button variant="secondary" onClick={handlePermissionsCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handlePermissionsConfirm}>
                Install
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="primary" onClick={handleInstallClick} disabled={installing}>
          {installing ? "Installing..." : "+ Install App"}
        </Button>
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
                <div className={styles.buttonGroup} onClick={(e) => e.stopPropagation()}>
                  {systemNeedsUpgrade || upgradingSystem ? (
                    <Button
                      variant="secondary"
                      onClick={handleSystemUpgrade}
                      disabled={upgradingSystem}
                      colors={{ base: 'transparent', hover: 'rgba(251,191,36,0.1)', active: 'rgba(251,191,36,0.2)', text: '#fbbf24', border: '1px solid #fbbf24' }}
                    >
                      {upgradingSystem ? "Upgrading..." : "Upgrade"}
                    </Button>
                  ) : (
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b', padding: '0 14px', lineHeight: '36px' }}>
                      Up to Date
                    </span>
                  )}
                </div>
              ) : (
                (() => {
                  const { canUninstall, dependents } = canUninstallApp(
                    app.id,
                    apps,
                  );
                  return (
                    <div className={styles.buttonGroup} onClick={(e) => e.stopPropagation()}>
                      {app.widgets &&
                        app.widgets.some(
                          (w) => w.target === "system-settings",
                        ) && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const systemWidget = app.widgets!.find(
                                (w) => w.target === "system-settings",
                              );
                              if (systemWidget) {
                                window.location.href = `/system/settings/applet/${systemWidget.id}`;
                              }
                            }}
                          >
                            Settings
                          </Button>
                        )}
                      <Button
                        variant="secondary"
                        onClick={() => handleUpgradeClick(app.id)}
                        disabled={upgrading === app.id}
                        colors={{ base: 'transparent', hover: 'rgba(251,191,36,0.1)', active: 'rgba(251,191,36,0.2)', text: '#fbbf24', border: '1px solid #fbbf24' }}
                      >
                        {upgrading === app.id ? "Upgrading..." : "Upgrade"}
                      </Button>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (canUninstall) {
                              handleUninstallClick(app.id, app.label);
                            }
                          }}
                          disabled={uninstalling === app.id || !canUninstall}
                          title={
                            !canUninstall
                              ? `Required by: ${dependents.join(", ")}`
                              : ""
                          }
                          colors={{ base: 'transparent', hover: 'rgba(239,68,68,0.1)', active: 'rgba(239,68,68,0.2)', text: '#ef4444', border: '1px solid #ef4444' }}
                        >
                          {uninstalling === app.id
                            ? "Uninstalling..."
                            : "Uninstall"}
                        </Button>
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
                              ", ",
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
