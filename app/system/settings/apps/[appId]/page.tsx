"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Accordion from "@/lib/components/Accordion";

interface SubApp {
  id: string;
  label: string;
  description: string;
  component: string;
  widgets?: Array<{
    id: string;
    name: string;
    description: string;
    target: string;
    component: string;
    appId: string;
  }>;
}

interface AppDetails {
  id: string;
  label: string;
  version: {
    major: number;
    minor: number;
    dev: number;
  };
  author: string;
  contactEmail: string;
  description: string;
  subApps?: SubApp[];
  apiRoutes?: Array<{
    path: string;
    method: string;
    handler: string;
    description: string;
  }>;
  dependencies?: Record<string, { major: number; minor: number; dev: number }>;
}

export default function AppDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId as string;
  const [app, setApp] = useState<AppDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppDetails = async () => {
      try {
        const response = await fetch(`/api/system/apps/${appId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(`App "${appId}" not found`);
          } else {
            setError("Failed to load app details");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setApp(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching app details:", err);
        setError("Failed to load app details");
        setLoading(false);
      }
    };

    if (appId) {
      fetchAppDetails();
    }
  }, [appId]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px",
        }}
      >
        <div style={{ color: "#94a3b8" }}>Loading app details...</div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div style={{ padding: "32px" }}>
        <button
          onClick={() => router.push("/system/settings/apps")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "24px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Apps
        </button>

        <div
          style={{
            background: "rgba(127, 29, 29, 0.2)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <h3
            style={{
              color: "#f87171",
              fontWeight: "600",
              marginBottom: "8px",
              margin: "0 0 8px 0",
            }}
          >
            Error
          </h3>
          <p style={{ color: "#fca5a5", fontSize: "14px", margin: "0" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  const versionString = `${app.version.major}.${app.version.minor}.${app.version.dev}`;

  return (
    <div style={{ padding: "32px" }}>
      <button
        onClick={() => router.push("/system/settings/apps")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          background: "#1e293b",
          color: "#e2e8f0",
          border: "1px solid #334155",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          marginBottom: "24px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Apps
      </button>

      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            color: "#f1f5f9",
            fontSize: "28px",
            fontWeight: "600",
            margin: "0 0 8px 0",
          }}
        >
          {app.label}
        </h1>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          v{versionString} • {app.author}
        </div>
        <p
          style={{
            color: "#e2e8f0",
            fontSize: "16px",
            margin: "0 0 16px 0",
            lineHeight: "1.6",
          }}
        >
          {app.description}
        </p>

        <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "12px" }}>App ID</div>
            <div style={{ color: "#f1f5f9", fontSize: "14px", fontFamily: "monospace" }}>
              {app.id}
            </div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "12px" }}>Contact</div>
            <div style={{ color: "#f1f5f9", fontSize: "14px" }}>
              {app.contactEmail}
            </div>
          </div>
        </div>
      </div>

      {app.subApps && app.subApps.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          {app.subApps.map((subApp) => (
            <div key={subApp.id} style={{ marginBottom: "12px" }}>
              <Accordion
                title={
                  <div>
                    <div
                      style={{
                        color: "#f1f5f9",
                        fontSize: "16px",
                        fontWeight: "500",
                      }}
                    >
                      {subApp.label}
                    </div>
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        fontFamily: "monospace",
                      }}
                    >
                      {app.id}:{subApp.id}
                    </div>
                  </div>
                }
              >
                <div style={{ color: "#e2e8f0", fontSize: "14px", marginBottom: "16px" }}>
                  {subApp.description}
                </div>

                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>Component</div>
                    <div
                      style={{
                        color: "#f1f5f9",
                        fontSize: "13px",
                        fontFamily: "monospace",
                      }}
                    >
                      {subApp.component}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>Widgets</div>
                    <div style={{ color: "#f1f5f9", fontSize: "13px" }}>
                      {subApp.widgets ? subApp.widgets.length : 0}
                    </div>
                  </div>
                </div>

                {subApp.widgets && subApp.widgets.length > 0 && (
                  <div>
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}
                    >
                      Widgets
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {subApp.widgets.map((widget) => (
                        <div
                          key={widget.id}
                          style={{
                            background: "#0f172a",
                            padding: "12px",
                            borderRadius: "6px",
                            border: "1px solid #334155",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ color: "#f1f5f9", fontSize: "14px", marginBottom: "4px" }}>
                              {widget.name}
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                              {widget.description}
                            </div>
                          </div>
                          <div
                            style={{
                              background: "#334155",
                              color: "#e2e8f0",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              fontSize: "12px",
                            }}
                          >
                            {widget.target}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Accordion>
            </div>
          ))}
        </div>
      )}

      {app.apiRoutes && app.apiRoutes.length > 0 && (
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              color: "#f1f5f9",
              fontSize: "20px",
              fontWeight: "600",
              margin: "0 0 16px 0",
            }}
          >
            API Routes ({app.apiRoutes.length})
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {app.apiRoutes.map((route, index) => (
              <div
                key={index}
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "12px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    background: route.method === "GET" ? "#10b981" : route.method === "POST" ? "#3b82f6" : route.method === "PATCH" ? "#fbbf24" : route.method === "DELETE" ? "#ef4444" : "#334155",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "600",
                    minWidth: "60px",
                    textAlign: "center",
                  }}
                >
                  {route.method}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#f1f5f9",
                      fontSize: "14px",
                      fontFamily: "monospace",
                    }}
                  >
                    /{route.path}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                    {route.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {app.dependencies && Object.keys(app.dependencies).length > 0 && (
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              color: "#f1f5f9",
              fontSize: "20px",
              fontWeight: "600",
              margin: "0 0 16px 0",
            }}
          >
            Dependencies
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(app.dependencies).map(([depId, version]) => (
              <div
                key={depId}
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ color: "#f1f5f9", fontSize: "14px" }}>{depId}</div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                >
                  {version.major}.{version.minor}.{version.dev}+
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
