import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/managers/user";
import { getSystemSettings } from "@/lib/managers/setting";
import UserManager from "@/lib/managers/user";
import AuthorityManager from "@/lib/managers/authority";
import AppletManager from "@/lib/managers/applet";
import AppletSettingManager from "@/lib/managers/appletSetting";
import SettingManager from "@/lib/managers/setting";
import Navigation from "@/lib/components/Navigation";
import { TabsetItem } from "@/lib/components/utility/Tabset";
import HomeTabBar from "@/lib/components/HomeTabBar";
import { getLauncherData } from "@/lib/helpers/launcherData";
import HomeApplets from "@/lib/components/HomeApplets";
import UtilityBar, {
  UtilityBarAppletInfo,
  WindowState,
} from "@/lib/components/UtilityBar";

const UTILITY_BAR_HEIGHT = 32;

async function getHomeMenuItems(userId: string): Promise<TabsetItem[]> {
  const homeMenuItems: TabsetItem[] = [
    {
      label: "Home",
      path: "/",
      icon: "home",
    },
  ];

  // Get user's accessible applets
  const authorityManager = new AuthorityManager();
  const userManager = new UserManager();
  const appletManager = new AppletManager();

  const userRecord = await userManager.readRecord(userId);
  if (!userRecord) return homeMenuItems;

  const mainAuthority = await authorityManager.readRecord(
    userRecord.data.authority_id,
  );
  const userAuthority = await authorityManager.readUserAuthority(userId);

  const appletIds = [
    ...(mainAuthority?.data.apps || []),
    ...(userAuthority?.data.apps || []),
  ];
  const uniqueAppletIds = [...new Set(appletIds)];

  // Get all applets
  const allAppletsResult = await appletManager.readRecords();
  const appTypeApplets = allAppletsResult.records.filter(
    (applet) =>
      applet.data.target === "app" && uniqueAppletIds.includes(applet.id),
  );

  for (const applet of appTypeApplets) {
    homeMenuItems.push({
      label: applet.data.label,
      path: `/app/${applet.id}`,
      icon: `/api/${applet.data.app}/assets/icon`,
    });
  }

  homeMenuItems.sort((a, b) => {
    if (a.label == "Home") {
      return -1;
    } else if (b.label == "Home") {
      return 1;
    }
    return a.label.localeCompare(b.label);
  });

  return homeMenuItems;
}

interface PinnedInstance {
  instanceId: string;
  appletId: string;
}

interface PinnedApplet {
  instanceId: string;
  appletId: string;
  label: string;
  description: string;
  component: string;
  app: string;
  instanceSettings: Record<string, any>;
}

async function getUserPinnedApplets(userId: string): Promise<PinnedApplet[]> {
  const settingManager = new SettingManager();
  const appletManager = new AppletManager();
  const appletSettingManager = new AppletSettingManager();
  const authorityManager = new AuthorityManager();
  const userManager = new UserManager();

  // Fetch user's pinned applets setting
  const setting = await settingManager.readRecord(`${userId}:home:applets`);

  if (!setting || !setting.data.value) {
    return [];
  }

  try {
    const instances: PinnedInstance[] = JSON.parse(setting.data.value);

    if (!Array.isArray(instances) || instances.length === 0) {
      return [];
    }

    // Get user's accessible applet IDs from their authorities
    const userRecord = await userManager.readRecord(userId);
    if (!userRecord) {
      return [];
    }

    const mainAuthority = await authorityManager.readRecord(
      userRecord.data.authority_id,
    );
    const userAuthority = await authorityManager.readUserAuthority(userId);

    const accessibleAppletIds = [
      ...(mainAuthority?.data.apps || []),
      ...(userAuthority?.data.apps || []),
    ];
    const uniqueAccessibleIds = new Set(accessibleAppletIds);

    // Fetch applet details and instance settings
    const pinnedApplets: PinnedApplet[] = [];
    for (const instance of instances) {
      // Check if user has access to this applet
      if (!uniqueAccessibleIds.has(instance.appletId)) {
        continue;
      }

      const applet = await appletManager.readRecord(instance.appletId);
      if (applet && applet.data.target === "home") {
        // Read instance settings and custom label
        let instanceSettings: Record<string, any> = {};
        let instanceLabel = applet.data.label;
        const settingRecord = await appletSettingManager.readRecord(
          instance.instanceId,
        );
        if (settingRecord) {
          instanceSettings = settingRecord.data.settings || {};
          if (settingRecord.data.label) {
            instanceLabel = settingRecord.data.label;
          }
        }

        pinnedApplets.push({
          instanceId: instance.instanceId,
          appletId: applet.id,
          label: instanceLabel,
          description: applet.data.description,
          component: applet.data.component,
          app: applet.data.app,
          instanceSettings,
        });
      }
    }

    // Silently clean up invalid instances from saved settings
    if (pinnedApplets.length !== instances.length) {
      const validInstances = pinnedApplets.map((a) => ({
        instanceId: a.instanceId,
        appletId: a.appletId,
      }));
      const table = await settingManager.getTable();
      await settingManager.upsertRecord(table, `${userId}:home:applets`, {
        value: JSON.stringify(validInstances),
        name: "home:applets",
        user: userId,
      });
    }

    return pinnedApplets;
  } catch {
    return [];
  }
}

async function getUserUtilityBarApplets(
  userId: string,
): Promise<UtilityBarAppletInfo[]> {
  const settingManager = new SettingManager();
  const appletManager = new AppletManager();
  const authorityManager = new AuthorityManager();
  const userManager = new UserManager();

  const setting = await settingManager.readRecord(`${userId}:ui:utilityBar`);
  if (!setting?.data.value) return [];

  let appletIds: string[];
  try {
    appletIds = JSON.parse(setting.data.value);
    if (!Array.isArray(appletIds) || appletIds.length === 0) return [];
  } catch {
    return [];
  }

  const userRecord = await userManager.readRecord(userId);
  if (!userRecord) return [];

  const mainAuthority = await authorityManager.readRecord(
    userRecord.data.authority_id,
  );
  const userAuthority = await authorityManager.readUserAuthority(userId);

  const accessibleIds = new Set([
    ...(mainAuthority?.data.apps || []),
    ...(userAuthority?.data.apps || []),
  ]);

  const utilityApplets: UtilityBarAppletInfo[] = [];
  for (const appletId of appletIds) {
    if (!accessibleIds.has(appletId)) continue;

    const applet = await appletManager.readRecord(appletId);
    if (!applet || applet.data.target !== "utility-bar") continue;

    utilityApplets.push({
      appletId,
      label: applet.data.label,
      app: applet.data.app,
      component: applet.data.component,
      poppable: applet.data.poppable ?? false,
      iconUrl: applet.data.icon
        ? `/api/${applet.data.app}/assets/${applet.data.icon}`
        : `/api/${applet.data.app}/assets/icon`,
    });
  }

  // Silently clean up inaccessible entries and their positions
  if (utilityApplets.length !== appletIds.length) {
    const validIds = utilityApplets.map((a) => a.appletId);
    const table = await settingManager.getTable();
    await settingManager.upsertRecord(table, `${userId}:ui:utilityBar`, {
      value: JSON.stringify(validIds),
      name: "ui:utilityBar",
      user: userId,
    });

    // Remove positions for applets that are no longer accessible
    const posSetting = await settingManager.readRecord(
      `${userId}:ui:utilityBarPositions`,
    );
    if (posSetting?.data.value) {
      try {
        const positions = JSON.parse(posSetting.data.value);
        const cleanPositions: Record<string, unknown> = {};
        for (const id of validIds) {
          if (positions[id]) cleanPositions[id] = positions[id];
        }
        const posTable = await settingManager.getTable();
        await settingManager.upsertRecord(
          posTable,
          `${userId}:ui:utilityBarPositions`,
          {
            value: JSON.stringify(cleanPositions),
            name: "ui:utilityBarPositions",
            user: userId,
          },
        );
      } catch {
        // ignore
      }
    }
  }

  return utilityApplets;
}

export default async function HomePage() {
  // Check if first-time setup is needed
  const userManager = new UserManager();
  const users = await userManager.listRecords();
  const needsSetup = users.length === 0;

  if (needsSetup) {
    redirect("/system/setup");
  }

  // Check if user is authenticated
  const currentUserResult = await getCurrentUser();

  if (!currentUserResult) {
    const settings = await getSystemSettings();
    const selfregistrationEnabled = settings.selfregistrationEnabled === "true";
    const brandName = settings.brandName || "Applicator";
    const brandIcon = settings.brandIcon
      ? `/api/system/assets/brand?t=${Date.now()}`
      : undefined;

    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#1e293b",
            padding: "60px 40px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            textAlign: "center",
            maxWidth: "500px",
            border: "1px solid #334155",
          }}
        >
          {brandIcon && (
            <img
              src={brandIcon}
              alt={brandName}
              style={{
                width: "64px",
                height: "64px",
                objectFit: "contain",
                marginBottom: "20px",
              }}
            />
          )}
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              marginBottom: "12px",
              color: "#f1f5f9",
            }}
          >
            {brandName}
          </h1>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "16px",
              marginBottom: "32px",
            }}
          >
            Sign in to continue
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <a
              href="/system/login"
              style={{
                display: "block",
                padding: "12px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                fontWeight: "600",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              Login
            </a>
            {selfregistrationEnabled && (
              <a
                href="/system/register"
                style={{
                  display: "block",
                  padding: "12px",
                  background: "transparent",
                  color: "#3b82f6",
                  border: "1px solid #3b82f6",
                  borderRadius: "5px",
                  fontSize: "16px",
                  fontWeight: "600",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                Register
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const user = currentUserResult.user;
  const profilePictureUrl = user.data.icon
    ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}`
    : undefined;

  const settings = await getSystemSettings();
  const brandSettings = {
    brandName: settings.brandName || "Applicator",
    brandIcon: settings.brandIcon
      ? `/api/system/assets/brand?t=${Date.now()}`
      : undefined,
  };

  const hasAdminAuth = currentUserResult.authorizations
    .flat()
    .includes("system:admin");

  const settingManager = new SettingManager();

  // App nav density
  const densitySetting = await settingManager.readRecord(
    `${user.id}:home:appDensity`,
  );
  const rawDensity = densitySetting?.data.value;
  const appDensity = (
    ["full", "name", "icon"].includes(rawDensity || "") ? rawDensity : "full"
  ) as "full" | "name" | "icon";

  // Utility bar density
  const utilityDensitySetting = await settingManager.readRecord(
    `${user.id}:ui:utilityBarDensity`,
  );
  const rawUtilityDensity = utilityDensitySetting?.data.value;
  const utilityBarDensity = (
    ["full", "name", "icon"].includes(rawUtilityDensity || "")
      ? rawUtilityDensity
      : "full"
  ) as "full" | "name" | "icon";

  // Saved pop-out window states (position + size in viewport %)
  const positionsSetting = await settingManager.readRecord(
    `${user.id}:ui:utilityBarPositions`,
  );
  let savedWindowStates: Record<string, WindowState> = {};
  if (positionsSetting?.data.value) {
    try {
      savedWindowStates = JSON.parse(positionsSetting.data.value);
    } catch {
      savedWindowStates = {};
    }
  }

  const homeMenuItems = await getHomeMenuItems(user.id);
  const pinnedApplets = await getUserPinnedApplets(user.id);
  const utilityBarApplets = await getUserUtilityBarApplets(user.id);
  const [launcherData, hotbarPins] = await Promise.all([
    getLauncherData(user.id, currentUserResult.authorizations.flat()),
    (async () => {
      const setting = await settingManager.readRecord(`${user.id}:hotbar:pins`);
      if (!setting?.data.value) return [] as string[];
      try {
        const parsed = JSON.parse(setting.data.value);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch { return [] as string[]; }
    })(),
  ]);
  const hasUtilityBar = utilityBarApplets.length > 0;

  return (
    <>
      {hasUtilityBar && (
        <style>{`@media (max-width: 767px) { .home-main { bottom: 0 !important; } }`}</style>
      )}
      <Navigation
        displayName={user.data.display_name}
        profilePicture={profilePictureUrl}
        isAdmin={hasAdminAuth}
        brandName={brandSettings.brandName}
        brandIcon={brandSettings.brandIcon}
        authorizations={currentUserResult.authorizations.flat()}
        isAssumedIdentity={currentUserResult.isAssumedIdentity}
      />
      <div
        className={hasUtilityBar ? "home-main" : undefined}
        style={{
          position: "fixed",
          top: "64px",
          left: 0,
          right: 0,
          bottom: hasUtilityBar ? UTILITY_BAR_HEIGHT : 0,
          background: "#0f172a",
        }}
      >
        <HomeTabBar
          allItems={homeMenuItems}
          initialPinnedIds={hotbarPins}
          density={appDensity}
          launcherData={launcherData}
        />
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
          {pinnedApplets.length > 0 ? (
            <HomeApplets
              applets={pinnedApplets}
              user={{
                username: user.data.username,
                displayName: user.data.display_name,
              }}
              widgetMaxHeight={`calc(100vh - 64px - 49px - ${hasUtilityBar ? UTILITY_BAR_HEIGHT : 0}px)`}
            />
          ) : (
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
                  background: "#1e293b",
                  padding: "60px 40px",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                  textAlign: "center",
                  maxWidth: "500px",
                  border: "1px solid #334155",
                }}
              >
                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    marginBottom: "20px",
                    color: "#f1f5f9",
                  }}
                >
                  Hello, {user.data.display_name}
                </h1>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  Customize your homescreen applets in{" "}
                  <a
                    href="/user/settings/home"
                    style={{
                      color: "#3b82f6",
                      textDecoration: "none",
                    }}
                  >
                    User Settings
                  </a>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
      {hasUtilityBar && (
        <UtilityBar
          applets={utilityBarApplets}
          density={utilityBarDensity}
          savedWindowStates={savedWindowStates}
          userId={user.id}
        />
      )}
    </>
  );
}
