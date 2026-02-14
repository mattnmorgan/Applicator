"use client";

import { useEffect, useState } from "react";
import DynamicAppLoader from "@/lib/components/utility/DynamicAppLoader";
import AppManager from "@/lib/client/managers/app";

interface AppletInfo {
  id: string;
  label: string;
  description: string;
  component: string;
  app: string;
}

interface HomeAppletsProps {
  applets: AppletInfo[];
}

interface AppletWithVersion extends AppletInfo {
  moduleUrl: string;
}

export default function HomeApplets({ applets }: HomeAppletsProps) {
  const [appletsWithVersions, setAppletsWithVersions] = useState<
    AppletWithVersion[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAppVersions = async () => {
      const appManager = new AppManager();

      // Get unique app IDs
      const uniqueAppIds = [...new Set(applets.map((a) => a.app))];

      // Fetch app versions
      const appVersions: Record<string, string> = {};
      try {
        const appData = await appManager.readRecords({ ids: uniqueAppIds });
        for (const record of appData.records || []) {
          const version = record.data.version;
          const versionString = `${version.major}.${version.minor}.${version.dev}`;
          appVersions[record.id] = versionString;
        }
      } catch (err) {
        console.error("Error fetching app versions:", err);
      }

      // Build applets with module URLs
      const appletsData = applets.map((applet) => ({
        ...applet,
        moduleUrl: `/api/${applet.app}/assets/source?v=${
          appVersions[applet.app] || "0.0.0"
        }`,
      }));

      setAppletsWithVersions(appletsData);
      setLoading(false);
    };

    if (applets.length > 0) {
      loadAppVersions();
    } else {
      setLoading(false);
    }
  }, [applets]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "256px",
        }}
      >
        <div style={{ color: "#94a3b8" }}>Loading applets...</div>
      </div>
    );
  }

  if (appletsWithVersions.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "24px",
      }}
    >
      {appletsWithVersions.map((applet) => (
        <div
          key={applet.id}
          style={{
            background: "#1e293b",
            borderRadius: "10px",
            border: "1px solid #334155",
            overflow: "hidden",
            minHeight: "200px",
          }}
        >
          <DynamicAppLoader
            moduleUrl={applet.moduleUrl}
            componentName={applet.component}
            componentProps={{
              appId: applet.id,
            }}
          />
        </div>
      ))}
    </div>
  );
}
