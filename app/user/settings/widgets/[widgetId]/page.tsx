"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DynamicAppLoader from "@/lib/components/DynamicAppLoader";

export default function AppWidgetPage() {
  const params = useParams();
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

            if (response.status === 403) {
              setError(
                "Access denied: You do not have permission to access this widget"
              );
            } else if (response.status === 404) {
              setError(`Widget "${widgetId}" does not exist`);
            } else {
              setError(errorData.error || "Widget not found");
            }

            setLoading(false);
            return;
          }

          const widgetInfo = await response.json();
          setComponentName(widgetInfo.component);

          // Fetch app metadata to get version from system:app table using generic API
          const appResponse = await fetch(`/api/system/apps/system/tables/app?fields=${encodeURIComponent(JSON.stringify({ id: mainAppId }))}`);
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
          const url = `/api/system/apps/${mainAppId}/assets/source?v=${versionString}`;
          setModuleUrl(url);
          setLoading(false);
          return;
        } else if (parts.length === 1) {
          // Old format: just widgetId, need to fetch from API
          widgetId = parts[0];

          const response = await fetch(`/api/system/widgets/${widgetId}`);
          if (!response.ok) {
            const errorData = await response.json();

            if (response.status === 403) {
              setError(
                "Access denied: You do not have permission to access this widget"
              );
            } else if (response.status === 404) {
              setError(`Widget "${widgetId}" does not exist`);
            } else {
              setError(errorData.error || "Widget not found");
            }

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
          const appResponse = await fetch(`/api/system/apps/system/tables/app?fields=${encodeURIComponent(JSON.stringify({ id: mainAppId }))}`);
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
          }}
        >
          <div
            style={{
              background: "#7f1d1d",
              border: "1px solid #991b1b",
              borderRadius: "8px",
              padding: "32px",
              maxWidth: "500px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#fca5a5", fontSize: "16px", margin: "0" }}>
              {error}
            </p>
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
