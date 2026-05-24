"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navigation from "@/lib/components/Navigation/Navigation";
import type { LauncherData, LauncherItem } from "@/lib/components/Navigation/Navigation";
import Tabset from "@/lib/components/utility/Tabset/Tabset";
import AppLauncherModal from "@/lib/components/Navigation/AppLauncherModal";
import DynamicAppLoader from "@/lib/components/utility/DynamicAppLoader";
import AppletManager from "@/lib/client/managers/applet";
import AppManager from "@/lib/client/managers/app";
import UtilityBar, {
  UtilityBarAppletInfo,
  WindowState,
} from "@/lib/components/UtilityBar";

const UTILITY_BAR_HEIGHT = 32;

interface TabsetItem {
  label: string;
  path?: string;
  icon?: string;
}

export default function AppPage() {
  const params = useParams();
  const router = useRouter();
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
    Array<{ id: string; label: string; description: string; target: string; app: string; appLabel: string }>
  >([]);
  const [authorizations, setAuthorizations] = useState<string[]>([]);
  const [isAssumedIdentity, setIsAssumedIdentity] = useState(false);
  const [brandName, setBrandName] = useState("Applicator");
  const [brandIcon, setBrandIcon] = useState<string | undefined>(undefined);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [appletComponent, setAppletComponent] = useState<string | null>(null);
  const [pinnedAppletIds, setPinnedAppletIds] = useState<string[]>([]);
  const [appDensity, setAppDensity] = useState<"full" | "name" | "icon">(
    "full",
  );
  const [moduleUrl, setModuleUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [utilityBarApplets, setUtilityBarApplets] = useState<
    UtilityBarAppletInfo[]
  >([]);
  const [utilityBarDensity, setUtilityBarDensity] = useState<
    "full" | "name" | "icon"
  >("full");
  const [utilityBarWindowStates, setUtilityBarWindowStates] = useState<
    Record<string, WindowState>
  >({});
  const [isMobile, setIsMobile] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);

  const appletManager = new AppletManager();
  const appManager = new AppManager();

  // Parse app ID and applet ID from URL (format: appId:appletId)
  const appId = fullAppId.includes(":") ? fullAppId.split(":")[0] : fullAppId;
  const appletId = fullAppId.includes(":")
    ? fullAppId.split(":")[1]
    : path[0] || "main";
  const remainingPath = fullAppId.includes(":") ? path : path.slice(1);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch user data
  useEffect(() => {
    fetch("/api/system/settings/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser({
            displayName: data.user.displayName,
            profilePicture: data.user.profilePicture,
            isAdmin: data.user.isAdmin || false,
          });
          setUserId(data.user.id);
          setUserApplets(data.userApplets || []);
          setAuthorizations(data.authorizations || []);
          setIsAssumedIdentity(data.isAssumedIdentity || false);

          // Read density preference
          const validDensities = ["full", "name", "icon"];
          const rawDensity = data.homeSettings?.appDensity;
          if (rawDensity && validDensities.includes(rawDensity)) {
            setAppDensity(rawDensity as "full" | "name" | "icon");
          }

          // Build utility bar applets
          const ubSettings = data.utilityBarSettings;
          if (ubSettings) {
            const rawUbDensity = ubSettings.density;
            if (rawUbDensity && validDensities.includes(rawUbDensity)) {
              setUtilityBarDensity(rawUbDensity as "full" | "name" | "icon");
            }

            if (
              ubSettings.windowStates &&
              typeof ubSettings.windowStates === "object"
            ) {
              setUtilityBarWindowStates(
                ubSettings.windowStates as Record<string, WindowState>,
              );
            }

            const appletIdOrder: string[] = Array.isArray(ubSettings.appletIds)
              ? ubSettings.appletIds
              : [];
            const accessibleMap = new Map(
              (data.userApplets || []).map((a: any) => [a.id, a]),
            );
            const ubApplets: UtilityBarAppletInfo[] = [];
            for (const appletId of appletIdOrder) {
              const applet = accessibleMap.get(appletId) as any;
              if (!applet || applet.target !== "utility-bar") continue;
              ubApplets.push({
                appletId,
                label: applet.label,
                app: applet.app,
                component: applet.component,
                poppable: applet.poppable ?? false,
                iconUrl: applet.icon
                  ? `/api/${applet.app}/assets/${applet.icon}`
                  : `/api/${applet.app}/assets/icon`,
              });
            }
            setUtilityBarApplets(ubApplets);
          }

          // Load hotbar pin state
          setPinnedAppletIds(data.hotbarPins || []);
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

        if (appletRecord.target !== "app") {
          setError(`Invalid applet: "${fullAppId}" is not an app applet`);
          setLoading(false);
          return;
        }

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
        setModuleUrl(`/api/${appId}/assets/source?v=${versionString}`);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching applet metadata:", err);
        setError("Failed to load app");
        setLoading(false);
      }
    })();
  }, [fullAppId, appId, appletId, user, userApplets]);

  const launcherData = useMemo<LauncherData | undefined>(() => {
    if (!user || userApplets.length === 0) return undefined;

    const BUILTIN_USER_SETTINGS: LauncherItem[] = [
      { label: "Homescreen", href: "/user/settings/home" },
      { label: "Notifications", href: "/user/settings/notifications" },
      { label: "Profile", href: "/user/settings/profile" },
      { label: "Sessions", href: "/user/settings/sessions" },
    ];

    const BUILTIN_SYSTEM_SETTINGS: LauncherItem[] = [
      { label: "Settings", href: "/system/settings" },
      { label: "Logs", href: "/system/settings/debug/logs" },
      { label: "Users", href: "/system/settings/user-management/users" },
      { label: "Authorities", href: "/system/settings/user-management/access-management/authorities" },
      { label: "Authorizations", href: "/system/settings/user-management/access-management/authorizations" },
      { label: "App Access Manager", href: "/system/settings/user-management/access-management/app-access" },
      { label: "App Permissions Manager", href: "/system/settings/user-management/access-management/app-permissions" },
      { label: "Permissions Manager", href: "/system/settings/user-management/access-management/permissions" },
      { label: "Agents", href: "/system/settings/agents" },
      { label: "Apps", href: "/system/settings/apps" },
      { label: "Tables", href: "/system/settings/data-models" },
    ];

    const BUILTIN_DEV_MENU: LauncherItem[] = [
      { label: "Development Settings", href: "/dev/settings" },
      { label: "API Endpoints", href: "/dev/test/api-endpoints" },
      { label: "Dynamic Inputs", href: "/dev/test/dynamic-inputs" },
      { label: "Logs", href: "/dev/test/logs" },
      { label: "Notifications", href: "/dev/test/notifications" },
      { label: "Form Editor and Viewer", href: "/dev/test/form-editor" },
      { label: "Panels", href: "/dev/test/panels" },
      { label: "Database", href: "/dev/utilities/database" },
      { label: "Elasticsearch", href: "/dev/utilities/elasticsearch" },
    ];

    const apps: LauncherItem[] = userApplets
      .filter((a) => a.target === "app")
      .map((a) => ({
        label: a.label,
        href: `/app/${a.id}`,
        appletId: a.id,
        appIconUrl: `/api/${a.app}/assets/icon`,
        appLabel: a.appLabel,
        description: a.description || undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const userSettingsApplets: LauncherItem[] = userApplets
      .filter((a) => a.target === "user-settings")
      .map((a) => ({
        label: a.label,
        href: `/user/settings/applet/${a.id}`,
        appIconUrl: `/api/${a.app}/assets/icon`,
        appLabel: a.appLabel,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const userSettings: LauncherItem[] = [
      ...BUILTIN_USER_SETTINGS,
      ...userSettingsApplets,
    ].sort((a, b) => a.label.localeCompare(b.label));

    let systemSettings: LauncherItem[] | undefined;
    if (user.isAdmin) {
      const systemSettingsApplets: LauncherItem[] = userApplets
        .filter((a) => a.target === "system-settings")
        .map((a) => ({
          label: a.label,
          href: `/system/settings/applet/${a.id}`,
          appIconUrl: `/api/${a.app}/assets/icon`,
          appLabel: a.appLabel,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      systemSettings = [...BUILTIN_SYSTEM_SETTINGS, ...systemSettingsApplets]
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    const devMenu = authorizations.includes("system:developer")
      ? [...BUILTIN_DEV_MENU].sort((a, b) => a.label.localeCompare(b.label))
      : undefined;

    return { apps, userSettings, systemSettings, devMenu };
  }, [user, userApplets, authorizations]);

  const pinnedSet = useMemo(() => new Set(pinnedAppletIds), [pinnedAppletIds]);

  const homeMenuItems = useMemo<TabsetItem[]>(() => {
    const items: TabsetItem[] = [{ label: "Home", path: "/", icon: "home" }];
    for (const applet of userApplets) {
      if (applet.target === "app" && pinnedAppletIds.includes(applet.id)) {
        items.push({
          label: applet.label,
          path: `/app/${applet.id}`,
          icon: `/api/${applet.app}/assets/icon`,
        });
      }
    }
    items.sort((a, b) => {
      if (a.path === "/") return -1;
      if (b.path === "/") return 1;
      return a.label.localeCompare(b.label);
    });
    return items;
  }, [userApplets, pinnedAppletIds]);

  const handlePinToggle = async (appletId: string, currentlyPinned: boolean) => {
    const next = currentlyPinned
      ? pinnedAppletIds.filter((id) => id !== appletId)
      : [...pinnedAppletIds, appletId];
    setPinnedAppletIds(next);
    try {
      await fetch("/api/system/settings/hotbar", {
        method: currentlyPinned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appletId }),
      });
    } catch {
      setPinnedAppletIds(pinnedAppletIds);
    }
  };

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
          bottom:
            utilityBarApplets.length > 0 && !isMobile ? UTILITY_BAR_HEIGHT : 0,
          background: "#0f172a",
        }}
      >
        <Tabset
          items={homeMenuItems}
          variant="horizontal"
          density={appDensity}
          stickyItems={launcherData ? [{ label: "App Launcher", icon: "sandwich", onClick: () => setShowLauncher(true) }] : undefined}
        />
        {showLauncher && launcherData && (
          <AppLauncherModal
            launcherData={launcherData}
            onClose={() => setShowLauncher(false)}
            pinnedIds={pinnedSet}
            onPinToggle={handlePinToggle}
          />
        )}
        <main
          style={{
            position: "absolute",
            top: "49px",
            left: 0,
            right: 0,
            bottom: 0,
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
                navigate: (url: string) => router.push(url),
              }}
              onError={(errorMessage) => setError(errorMessage)}
            />
          )}
        </main>
      </div>
      {utilityBarApplets.length > 0 && userId && (
        <UtilityBar
          applets={utilityBarApplets}
          density={utilityBarDensity}
          savedWindowStates={utilityBarWindowStates}
          userId={userId}
          disabledAppId={appId}
        />
      )}
    </>
  );
}
