"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/lib/components/Navigation/Navigation";
import Tabset from "@/lib/components/Tabset/Tabset";
import DynamicAppLoader from "@/lib/components/DynamicAppLoader";

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
  const [userSubApps, setUserSubApps] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [authorizations, setAuthorizations] = useState<string[]>([]);
  const [isAssumedIdentity, setIsAssumedIdentity] = useState(false);
  const [brandName, setBrandName] = useState("Applicator");
  const [brandIcon, setBrandIcon] = useState<string | undefined>(undefined);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [subAppComponent, setSubAppComponent] = useState<string | null>(null);
  const [homeMenuItems, setHomeMenuItems] = useState<TabsetItem[]>([]);
  const [moduleUrl, setModuleUrl] = useState<string | null>(null);

  // Parse main app ID and sub-app ID from URL
  const mainAppId = fullAppId.includes(":")
    ? fullAppId.split(":")[0]
    : fullAppId;
  const subAppId = fullAppId.includes(":")
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
          setUserSubApps(data.userSubApps || []);
          setAuthorizations(data.authorizations || []);
          setIsAssumedIdentity(data.isAssumedIdentity || false);

          // Build home menu items
          const menuItems: TabsetItem[] = [
            {
              label: "Home",
              path: "/",
            },
          ];

          // Add user's accessible sub-apps as tabs
          if (data.userSubApps) {
            for (const subApp of data.userSubApps) {
              menuItems.push({
                label: subApp.label,
                path: `/app/${subApp.id}`,
              });
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
    fetch("/api/system/settings/brand")
      .then((res) => res.json())
      .then((data) => {
        setBrandName(data.brandName || "Applicator");
        setBrandIcon(data.brandIcon);
      })
      .catch((err) => {
        console.error("Error fetching brand settings:", err);
      });
  }, []);

  // Fetch app metadata and check authorization
  useEffect(() => {
    if (!fullAppId || !user || userSubApps.length === 0) {
      // Wait until we have the user's sub-apps loaded
      return;
    }

    // Check if user has access to this sub-app
    const hasAccess = userSubApps.some((app) => app.id === fullAppId);

    if (!hasAccess) {
      setError(`Access denied: You do not have permission to access this app`);
      setLoading(false);
      return;
    }

    // Fetch main app metadata from system:app table using generic API
    fetch(
      `/api/system/apps/system/tables/app?fields=${encodeURIComponent(
        JSON.stringify({ id: mainAppId })
      )}`
    )
      .then((res) => {
        if (!res.ok) {
          setError(`App "${mainAppId}" does not exist`);
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.success && data.records && data.records.length > 0) {
          const appRecord = data.records[0].data;

          // Format version object to string (e.g., "1.0.0")
          const versionString = `${appRecord.version.major}.${appRecord.version.minor}.${appRecord.version.dev}`;
          setAppVersion(versionString);

          // Find the sub-app to get component name
          const subApp = appRecord.subApps?.find(
            (sa: any) => sa.id === subAppId
          );
          if (!subApp) {
            setError(`Sub-app "${subAppId}" not found in app "${mainAppId}"`);
            setLoading(false);
            return;
          }

          setSubAppComponent(subApp.component);

          // Set the module URL for the DynamicAppLoader
          setModuleUrl(
            `/api/system/apps/${mainAppId}/assets/source?v=${versionString}`
          );
          setLoading(false);
        } else if (data) {
          setError(`App "${mainAppId}" does not exist`);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching app metadata:", err);
        setError("Failed to load app");
        setLoading(false);
      });
  }, [fullAppId, mainAppId, subAppId, user, userSubApps]);

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

          {moduleUrl && subAppComponent && !error && (
            <DynamicAppLoader
              moduleUrl={moduleUrl}
              componentName={subAppComponent}
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
