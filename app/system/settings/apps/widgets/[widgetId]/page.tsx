"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DynamicAppLoader from "@/lib/components/DynamicAppLoader";

export default function SystemSettingsWidgetPage() {
  const params = useParams();
  const router = useRouter();
  const compositeId = decodeURIComponent(params.widgetId as string);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleUrl, setModuleUrl] = useState<string | null>(null);
  const [componentName, setComponentName] = useState<string | null>(null);

  // Parse composite ID and verify access
  useEffect(() => {
    async function parseAndFetchWidget() {
      try {
        // Try to parse as composite ID (mainAppId:subAppId:widgetId)
        const parts = compositeId.split(":");

        let mainAppId: string;
        let subAppId: string;
        let widgetId: string;

        if (parts.length === 3) {
          // New format: mainAppId:subAppId:widgetId
          [mainAppId, subAppId, widgetId] = parts;

          // We still need to fetch the widget to get the component name and verify access
          const response = await fetch(`/api/system/widgets/${widgetId}`);
          if (!response.ok) {
            const errorData = await response.json();
            setError(errorData.error || "Widget not found");
            setLoading(false);
            return;
          }

          const widgetInfo = await response.json();
          setComponentName(widgetInfo.component);

          // Fetch app metadata to get version from system:app table using generic API
          const appResponse = await fetch(`/api/system/apps/system/tables/app?ids=${encodeURIComponent(mainAppId)}`);
          if (!appResponse.ok) {
            setError("Failed to load app information");
            setLoading(false);
            return;
          }

          const appResponseData = await appResponse.json();
          if (!appResponseData.success || !appResponseData.records || appResponseData.records.length === 0) {
            setError("Failed to load app information");
            setLoading(false);
            return;
          }

          const appData = appResponseData.records[0].data;
          const versionString = `${appData.version.major}.${appData.version.minor}.${appData.version.dev}`;
          setModuleUrl(`/api/system/apps/${mainAppId}/assets/source?v=${versionString}`);
          setLoading(false);
          return;
        } else if (parts.length === 1) {
          // Old format: just widgetId, need to fetch from API
          widgetId = parts[0];

          const response = await fetch(`/api/system/widgets/${widgetId}`);
          if (!response.ok) {
            const errorData = await response.json();
            setError(errorData.error || "Widget not found");
            setLoading(false);
            return;
          }

          const widgetInfo = await response.json();
          const fullAppId = widgetInfo.appId;
          const appParts = fullAppId.split(":");

          if (appParts.length !== 2) {
            setError("Invalid widget app ID format");
            setLoading(false);
            return;
          }

          mainAppId = appParts[0];
          subAppId = fullAppId;
          setComponentName(widgetInfo.component);

          // Get app version from system:app table using generic API
          const appResponse = await fetch(`/api/system/apps/system/tables/app?ids=${encodeURIComponent(mainAppId)}`);
          if (!appResponse.ok) {
            setError("Failed to load app information");
            setLoading(false);
            return;
          }

          const appResponseData = await appResponse.json();
          if (!appResponseData.success || !appResponseData.records || appResponseData.records.length === 0) {
            setError("Failed to load app information");
            setLoading(false);
            return;
          }

          const appData = appResponseData.records[0].data;
          const versionString = `${appData.version.major}.${appData.version.minor}.${appData.version.dev}`;
          setModuleUrl(`/api/system/apps/${mainAppId}/assets/source?v=${versionString}`);
          setLoading(false);
          return;
        } else {
          setError("Invalid widget ID format");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error loading widget:", err);
        setError("Failed to load widget information");
        setLoading(false);
      }
    }

    parseAndFetchWidget();
  }, [compositeId]);

  return (
    <>
      <div style={{ marginBottom: "24px" }}>
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
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
          }}
        >
          <div style={{ color: "#94a3b8" }}>Loading widget...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "32px" }}>
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
              }}
            >
              Error
            </h3>
            <p style={{ color: "#fca5a5", fontSize: "14px" }}>{error}</p>
          </div>
        </div>
      )}

      {moduleUrl && componentName && !error && (
        <DynamicAppLoader
          moduleUrl={moduleUrl}
          componentName={componentName}
          componentType="widget"
          onError={(errorMessage) => setError(errorMessage)}
        />
      )}
    </>
  );
}
