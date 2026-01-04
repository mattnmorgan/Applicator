"use client";

import { useState, useEffect } from "react";
import styles from "./AppView.module.css";

interface ApiRoute {
  path: string;
  method: string;
  handler: string;
  description: string;
}

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
  apiRoutes: ApiRoute[];
  widgets?: Widget[];
  dependencies?: Record<string, AppVersion>;
}

function formatVersion(version: AppVersion): string {
  return `${version.major}.${version.minor}.${version.dev}`;
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
      const response = await fetch(`/api/system/apps`);
      if (response.ok) {
        const data = await response.json();
        setAllApps(data.apps || []);
        const appData = data.apps?.find((a: App) => a.id === appId);
        if (appData) {
          setApp(appData);
          // Try to load icon
          const iconResponse = await fetch(
            `/api/system/apps/${appId}/assets/icon`
          );
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
            <span className={styles.versionBadge}>
              v{formatVersion(app.version)}
            </span>
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
                            src={`/api/system/apps/${depId}/assets/icon`}
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
              }
            )}
          </div>
        </div>
      )}

      {app.widgets && app.widgets.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Widgets</h2>
          <div className={styles.widgetList}>
            {app.widgets.map((widget) => (
              <div key={widget.id} className={styles.widgetRow}>
                <div className={styles.widgetInfo}>
                  <div className={styles.widgetName}>{widget.name}</div>
                  <div className={styles.widgetDescription}>
                    {widget.description}
                  </div>
                </div>
                <div className={styles.widgetTarget}>
                  {widget.target === "home" && "Home Screen"}
                  {widget.target === "user-settings" && "User Settings"}
                  {widget.target === "system-settings" && "System Settings"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {app.apiRoutes && app.apiRoutes.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>API Routes</h2>
          <div className={styles.routeList}>
            {app.apiRoutes.map((route, index) => (
              <div key={index} className={styles.routeRow}>
                <div className={styles.routeMethod}>{route.method}</div>
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
