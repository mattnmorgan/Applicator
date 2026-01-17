"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/lib/components/Navigation/Navigation";
import Tabset from "@/lib/components/Tabset/Tabset";
import DynamicAppLoader from "@/lib/components/DynamicAppLoader";
import AppletManager from "@/lib/database/client/managers/applet";
import AppManager from "@/lib/database/client/managers/app";

interface TabsetItem {
  label: string;
  path?: string;
}

export default function AppPage() {
  const params = useParams();
  // Decode the URL parameter to convert %3A back to :
  const fullAppId = decodeURIComponent(params.appId as string);
  const path = (params.path as string[]) || [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{
    displayName: string;
    profilePicture?: string;
    isAdmin: boolean;
  } | null>(null);
  const [userApplets, setUserApplets] = useState<
    Array<{ id: string; label: string; target: string }>
  >([]);
  const [authorizations, setAuthorizations] = useState<string[]>([]);
  const [isAssumedIdentity, setIsAssumedIdentity] = useState(false);
  const [brandName, setBrandName] = useState("Applicator");
  const [brandIcon, setBrandIcon] = useState<string | undefined>(undefined);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [appletComponent, setAppletComponent] = useState<string | null>(null);
  const [homeMenuItems, setHomeMenuItems] = useState<TabsetItem[]>([]);
  const [moduleUrl, setModuleUrl] = useState<string | null>(null);

  const appletManager = new AppletManager();
  const appManager = new AppManager();

  // Parse app ID and applet ID from URL (format: appId:appletId)
  const appId = fullAppId.includes(":")
    ? fullAppId.split(":")[0]
    : fullAppId;
  const appletId = fullAppId.includes(":")
    ? fullAppId.split(":")[1]
    : path[0] || "main";
  const remainingPath = fullAppId.includes(":") ? path : path.slice(1);

  // Fetch user data
  useEffect(() => {
    fetch("/api/system/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser({
            displayName: data.user.displayName,
            profilePicture: data.user.profilePicture,
            isAdmin: data.user.isAdmin || false,
          });
          setUserApplets(data.userApplets || []);
          setAuthorizations(data.authorizations || []);
          setIsAssumedIdentity(data.isAssumedIdentity || false);

          // Build home menu items
          const menuItems: TabsetItem[] = [
            {
              label: "Home",
              path: "/",
            },
          ];

          // Add user's accessible applets with target="app" as tabs
          if (data.userApplets) {
            for (const applet of data.userApplets) {
              if (applet.target === "app") {
                menuItems.push({
                  label: applet.label,
                  path: `/app/${applet.id}`,
                });
              }
            }
          }

          setHomeMenuItems(menuItems);
        }
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
      });
  }, []);

  // Fetch brand settings
  useEffect(() => {
    fetch("/api/system/settings")
      .then((res) => res.json())
      .then((data) => {
        const settings = data.settings;
        setBrandName(settings.brandName || "Applicator");
        if (settings.brandIcon) {
          setBrandIcon(`/api/system/assets/brand?t=${Date.now()}`);
        }
      })
      .catch((err) => {
        console.error("Error fetching brand settings:", err);
      });
  }, []);

  // Fetch applet metadata and check authorization
  useEffect(() => {
    if (!fullAppId || !user || userApplets.length === 0) {
      // Wait until we have the user's applets loaded
      return;
    }

    // Check if user has access to this applet
    const hasAccess = userApplets.some((applet) => applet.id === fullAppId);

    if (!hasAccess) {
      setError(`Access denied: You do not have permission to access this app`);
      setLoading(false);
      return;
    }

    // Fetch applet and app metadata using managers
    (async () => {
      try {
        const appletData = await appletManager.readRecords({
          ids: [fullAppId],
        });

        if (!appletData.records || appletData.records.length === 0) {
          setError(`Applet "${fullAppId}" does not exist`);
          setLoading(false);
          return;
        }

        const appletRecord = appletData.records[0].data;
        setAppletComponent(appletRecord.component);

        // Fetch the main app to get the version
        const appData = await appManager.readRecords({ ids: [appId] });

        if (!appData.records || appData.records.length === 0) {
          setError(`App "${appId}" does not exist`);
          setLoading(false);
          return;
        }

        const appRecord = appData.records[0].data;

        // Format version object to string (e.g., "1.0.0")
        const versionString = `${appRecord.version.major}.${appRecord.version.minor}.${appRecord.version.dev}`;
        setAppVersion(versionString);

        // Set the module URL for the DynamicAppLoader
        setModuleUrl(
          `/api/system/apps/${appId}/assets/source?v=${versionString}`
        );
        setLoading(false);
      } catch (err) {
        console.error("Error fetching applet metadata:", err);
        setError("Failed to load app");
        setLoading(false);
      }
    })();
  }, [fullAppId, appId, appletId, user, userApplets]);

  return (
    <>
      <Navigation
        displayName={user?.displayName || ""}
        profilePicture={user?.profilePicture}
        isAdmin={user?.isAdmin || false}
        brandName={brandName}
        brandIcon={brandIcon}
        authorizations={authorizations}
        isAssumedIdentity={isAssumedIdentity}
      />
      <div
        style={{
          position: "fixed",
          top: "64px",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#0f172a",
        }}
      >
        <Tabset items={homeMenuItems} variant="horizontal" />
        <main
          style={{
            position: "absolute",
            top: "49px",
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "auto",
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "256px",
              }}
            >
              <div style={{ color: "#94a3b8" }}>Loading app...</div>
            </div>
          )}

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
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

          {moduleUrl && appletComponent && !error && (
            <DynamicAppLoader
              moduleUrl={moduleUrl}
              componentName={appletComponent}
              componentProps={{
                path: remainingPath,
                appId: fullAppId,
              }}
              onError={(errorMessage) => setError(errorMessage)}
            />
          )}
        </main>
      </div>
    </>
  );
}
