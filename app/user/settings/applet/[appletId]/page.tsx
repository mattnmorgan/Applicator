"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DynamicAppLoader from "@/lib/components/DynamicAppLoader";
import AppletManager from "@/lib/database/client/managers/applet";
import AppManager from "@/lib/database/client/managers/app";

export default function UserSettingsAppletPage() {
  const params = useParams();
  const fullAppletId = decodeURIComponent(params.appletId as string);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleUrl, setModuleUrl] = useState<string | null>(null);
  const [componentName, setComponentName] = useState<string | null>(null);
  const [userApplets, setUserApplets] = useState<string[]>([]);

  const appletManager = new AppletManager();
  const appManager = new AppManager();

  // Fetch user's accessible applets
  useEffect(() => {
    fetch("/api/system/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.userApplets) {
          setUserApplets(data.userApplets.map((a: any) => a.id));
        }
      })
      .catch((err) => {
        console.error("Error fetching user applets:", err);
      });
  }, []);

  // Parse applet ID and verify access
  useEffect(() => {
    async function parseAndFetchApplet() {
      if (userApplets.length === 0) {
        // Wait until we have the user's applets loaded
        return;
      }

      try {
        // Check if user has access to this applet
        const hasAccess = userApplets.includes(fullAppletId);

        if (!hasAccess) {
          setError(`Access denied: You do not have permission to access this applet`);
          setLoading(false);
          return;
        }

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
        const url = `/api/system/apps/${appId}/assets/source?v=${versionString}`;
        setModuleUrl(url);
        setLoading(false);
      } catch (err) {
        console.error("Error loading applet:", err);
        setError("Failed to load applet information");
        setLoading(false);
      }
    }

    parseAndFetchApplet();
  }, [fullAppletId, userApplets]);

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
          <div style={{ color: "#94a3b8" }}>Loading applet...</div>
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
          onError={(errorMessage) => setError(errorMessage)}
        />
      )}
    </>
  );
}
