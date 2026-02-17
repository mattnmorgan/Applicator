"use client";

import { useState, useEffect } from "react";
import styles from "./AppView.module.css";
import Accordion from "@/lib/components/utility/Accordion/Accordion";
import Badge from "@/lib/components/utility/Badge/Badge";
import AppManager from "@/lib/client/managers/app";
import ApiRouteManager from "@/lib/client/managers/apiRoute";
import AppletManager from "@/lib/client/managers/applet";

interface ApiRoute {
  path: string;
  method: string;
  description: string;
}

interface Widget {
  id: string;
  name: string;
  description: string;
  target: "home" | "user-settings" | "system-settings" | "app" | "guest";
  component: string;
  appId: string;
}

interface SubApp {
  id: string;
  label: string;
  description: string;
  component: string;
  widgets?: Widget[];
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
  apiRoutes: ApiRoute[];
  widgets?: Widget[];
  subApps?: SubApp[];
  dependencies?: Record<string, AppVersion>;
  requiredPermissions: string[];
}

function formatVersion(version: AppVersion): string {
  return `${version.major}.${version.minor}.${version.dev}`;
}

function getMethodBadgeVariant(
  method: string,
): "green" | "blue" | "yellow" | "red" | "purple" | "gray" {
  switch (method.toUpperCase()) {
    case "GET":
      return "blue";
    case "POST":
      return "green";
    case "PUT":
    case "PATCH":
      return "yellow";
    case "DELETE":
      return "red";
    default:
      return "gray";
  }
}

function getTargetBadgeVariant(
  target: string,
): "green" | "blue" | "yellow" | "red" | "purple" | "gray" {
  switch (target) {
    case "home":
      return "blue";
    case "user-settings":
      return "green";
    case "system-settings":
      return "purple";
    case "app":
      return "yellow";
    case "guest":
      return "red";
    default:
      return "gray";
  }
}

interface AppViewProps {
  appId: string;
  onBack: () => void;
}

export default function AppView({ appId, onBack }: AppViewProps) {
  const [app, setApp] = useState<App | null>(null);
  const [allApps, setAllApps] = useState<App[]>([]);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApp();
  }, [appId]);

  async function loadApp() {
    try {
      setLoading(true);
      const appManager = new AppManager();
      const apiRouteManager = new ApiRouteManager();
      const appletManager = new AppletManager();

      // Fetch apps, apiRoutes, and applets in parallel
      const [appsData, apiRoutesData, appletsData] = await Promise.all([
        appManager.readRecords({}),
        apiRouteManager.readRecords({}),
        appletManager.readRecords({}),
      ]);

      if (appsData.records) {
        // Group API routes by app
        const apiRoutesByApp: Record<string, any[]> = {};
        if (apiRoutesData.records) {
          for (const route of apiRoutesData.records) {
            const appIdKey = route.data.app;
            if (!apiRoutesByApp[appIdKey]) {
              apiRoutesByApp[appIdKey] = [];
            }
            apiRoutesByApp[appIdKey].push({
              path: route.data.path,
              method: route.data.method,
              description: route.data.description,
            });
          }
        }

        // Group applets by app
        const appletsByApp: Record<string, Widget[]> = {};
        if (appletsData.records) {
          for (const applet of appletsData.records) {
            const appIdKey = applet.data.app;
            if (!appletsByApp[appIdKey]) {
              appletsByApp[appIdKey] = [];
            }
            appletsByApp[appIdKey].push({
              id: applet.id,
              name: applet.data.label,
              description: applet.data.description,
              target: applet.data.target,
              component: applet.data.component,
              appId: applet.data.app,
            });
          }
        }

        // Transform apps with their API routes and applets
        const transformedApps = appsData.records.map((record) => ({
          id: record.id,
          label: record.data.label,
          version: record.data.version,
          author: record.data.author,
          contactEmail: record.data.contact_email,
          description: record.data.description,
          dependencies: record.data.dependencies,
          apiRoutes: apiRoutesByApp[record.id] || [],
          widgets: appletsByApp[record.id] || [],
          requiredPermissions: record.data.required_permissions,
        }));

        setAllApps(transformedApps);
        const appData = transformedApps.find((a: App) => a.id === appId);
        if (appData) {
          setApp(appData);
          // Try to load icon
          const iconResponse = await fetch(`/api/${appId}/assets/icon`);
          if (iconResponse.ok) {
            const blob = await iconResponse.blob();
            setIconUrl(URL.createObjectURL(blob));
          }
        }
      }
    } catch (error) {
      console.error("Error loading app:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>App not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Apps
        </button>
      </div>

      <div className={styles.appInfo}>
        {iconUrl && (
          <img
            src={iconUrl}
            alt={`${app.label} icon`}
            className={styles.icon}
          />
        )}
        <div className={styles.details}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{app.label}</h1>
            <Badge variant="gray">v{formatVersion(app.version)}</Badge>
          </div>
          <p className={styles.author}>
            by {app.author}
            {app.contactEmail && (
              <span className={styles.email}> ({app.contactEmail})</span>
            )}
          </p>
          <p className={styles.description}>{app.description}</p>
        </div>
      </div>

      {app.dependencies && Object.keys(app.dependencies).length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Dependencies</h2>
          <div className={styles.dependencyList}>
            {Object.entries(app.dependencies).map(
              ([depId, requiredVersion]) => {
                const depApp = allApps.find((a) => a.id === depId);
                return (
                  <div key={depId} className={styles.dependencyRow}>
                    <div className={styles.dependencyIcon}>
                      {depApp ? (
                        <>
                          <span className={styles.dependencyIconFallback}>
                            {depApp.label.charAt(0).toUpperCase()}
                          </span>
                          <img
                            src={`/api/${depId}/assets/icon`}
                            alt={depApp?.label || depId}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement;
                              const sibling =
                                target.previousElementSibling as HTMLElement;
                              if (sibling) {
                                sibling.style.display = "none";
                              }
                            }}
                          />
                        </>
                      ) : (
                        <span className={styles.dependencyIconFallback}>?</span>
                      )}
                    </div>
                    <div className={styles.dependencyInfo}>
                      <div className={styles.dependencyName}>
                        {depApp?.label || depId}
                      </div>
                      <div className={styles.dependencyVersions}>
                        <span className={styles.versionRequired}>
                          Required: v{formatVersion(requiredVersion)}
                        </span>
                        {depApp && (
                          <span className={styles.versionInstalled}>
                            • Installed: v{formatVersion(depApp.version)}
                          </span>
                        )}
                        {!depApp && (
                          <span className={styles.versionMissing}>
                            • Not installed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {app.subApps && app.subApps.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Sub-Applications</h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {app.subApps.map((subApp) => (
              <Accordion
                key={subApp.id}
                title={
                  <div
                    style={{
                      color: "#f1f5f9",
                      fontSize: "16px",
                      fontWeight: "500",
                    }}
                  >
                    {subApp.label}
                  </div>
                }
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: "13px",
                        fontWeight: "500",
                        marginBottom: "8px",
                      }}
                    >
                      Description
                    </div>
                    <div style={{ color: "#e2e8f0", fontSize: "14px" }}>
                      {subApp.description}
                    </div>
                  </div>

                  {subApp.widgets && subApp.widgets.length > 0 && (
                    <div>
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: "13px",
                          fontWeight: "500",
                          marginBottom: "8px",
                        }}
                      >
                        Widgets ({subApp.widgets.length})
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {subApp.widgets.map((widget) => (
                          <div
                            key={widget.id}
                            style={{
                              background: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "6px",
                              padding: "12px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: "6px",
                              }}
                            >
                              <div
                                style={{
                                  color: "#f1f5f9",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                }}
                              >
                                {widget.name}
                              </div>
                              <Badge
                                variant={getTargetBadgeVariant(widget.target)}
                              >
                                {widget.target === "home" && "Home"}
                                {widget.target === "user-settings" &&
                                  "User Settings"}
                                {widget.target === "system-settings" &&
                                  "System Settings"}
                                {widget.target === "app" && "App"}
                                {widget.target === "guest" && "Guest App"}
                              </Badge>
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                              {widget.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Accordion>
            ))}
          </div>
        </div>
      )}

      {app.widgets && app.widgets.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Applets</h2>
          <div className={styles.widgetList}>
            {app.widgets.map((widget) => (
              <div key={widget.id} className={styles.widgetRow}>
                <div className={styles.widgetInfo}>
                  <div className={styles.widgetName}>{widget.name}</div>
                  <div className={styles.widgetDescription}>
                    {widget.description}
                  </div>
                </div>
                <Badge variant={getTargetBadgeVariant(widget.target)}>
                  {widget.target === "home" && "Home"}
                  {widget.target === "user-settings" && "User Settings"}
                  {widget.target === "system-settings" && "System Settings"}
                  {widget.target === "app" && "App"}
                  {widget.target === "guest" && "Guest"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {app.apiRoutes && app.apiRoutes.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>API</h2>
          <div className={styles.routeList}>
            {app.apiRoutes.map((route, index) => (
              <div key={index} className={styles.routeRow}>
                <Badge variant={getMethodBadgeVariant(route.method)}>
                  {route.method}
                </Badge>
                <div className={styles.routePath}>
                  /api/{app.id}/{route.path}
                </div>
                <div className={styles.routeDescription}>
                  {route.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
