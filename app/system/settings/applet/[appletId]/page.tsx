"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DynamicAppLoader from "@/lib/components/utility/DynamicAppLoader";
import AppletManager from "@/lib/client/managers/applet";
import AppManager from "@/lib/client/managers/app";
import Button from "@/lib/components/utility/Button";
export default function SystemSettingsAppletPage() {
  const params = useParams();
  const router = useRouter();
  const fullAppletId = decodeURIComponent(params.appletId as string);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleUrl, setModuleUrl] = useState<string | null>(null);
  const [componentName, setComponentName] = useState<string | null>(null);

  const appletManager = new AppletManager();
  const appManager = new AppManager();

  // Parse applet ID and load component
  useEffect(() => {
    async function parseAndFetchApplet() {
      try {
        // Parse appId from fullAppletId (format: appId:appletId)
        const parts = fullAppletId.split(":");
        if (parts.length !== 2) {
          setError("Invalid applet ID format");
          setLoading(false);
          return;
        }

        const appId = parts[0];

        // Fetch applet metadata
        const appletData = await appletManager.readRecords({
          ids: [fullAppletId],
        });
        if (!appletData.records || appletData.records.length === 0) {
          setError(`Applet "${fullAppletId}" does not exist`);
          setLoading(false);
          return;
        }

        const appletRecord = appletData.records[0].data;
        setComponentName(appletRecord.component);

        // Fetch app metadata to get version
        const appResponseData = await appManager.readRecords({ ids: [appId] });
        if (!appResponseData.records || appResponseData.records.length === 0) {
          setError("Failed to load app information");
          setLoading(false);
          return;
        }

        const appData = appResponseData.records[0].data;
        const versionString = `${appData.version.major}.${appData.version.minor}.${appData.version.dev}`;
        setModuleUrl(`/api/${appId}/assets/source?v=${versionString}`);
        setLoading(false);
      } catch (err) {
        console.error("Error loading applet:", err);
        setError("Failed to load applet information");
        setLoading(false);
      }
    }

    parseAndFetchApplet();
  }, [fullAppletId]);

  return (
    <>
      <div style={{ marginBottom: "24px" }}>
        <Button variant="ghost" onClick={() => router.push("/system/settings/apps")}>
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
        </Button>
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
          <div style={{ color: "#94a3b8" }}>Loading applet...</div>
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
          onError={(errorMessage) => setError(errorMessage)}
        />
      )}
    </>
  );
}
