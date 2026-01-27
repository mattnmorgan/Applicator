import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getSystemSettings } from "@/lib/database/managers/setting";
import UserManager from "@/lib/database/managers/user";
import AuthorityManager from "@/lib/database/managers/authority";
import AppletManager from "@/lib/database/managers/applet";
import SettingManager from "@/lib/database/managers/setting";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/utility/Tabset";
import HomeApplets from "@/lib/components/HomeApplets";

async function getHomeMenuItems(userId: string): Promise<TabsetItem[]> {
  const homeMenuItems: TabsetItem[] = [
    {
      label: "Home",
      path: "/",
    },
  ];

  // Get user's accessible applets
  const authorityManager = new AuthorityManager();
  const userManager = new UserManager();
  const appletManager = new AppletManager();

  const userRecord = await userManager.readRecord(userId);
  if (!userRecord) return homeMenuItems;

  const mainAuthority = await authorityManager.readRecord(
    userRecord.data.authority,
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
    });
  }

  return homeMenuItems;
}

interface PinnedApplet {
  id: string;
  label: string;
  description: string;
  component: string;
  app: string;
}

async function getUserPinnedApplets(userId: string): Promise<PinnedApplet[]> {
  const settingManager = new SettingManager();
  const appletManager = new AppletManager();

  // Fetch user's pinned applets setting
  const setting = await settingManager.readRecord(`${userId}:home:applets`);

  if (!setting || !setting.data.value) {
    return [];
  }

  try {
    const appletIds = JSON.parse(setting.data.value);

    if (!Array.isArray(appletIds) || appletIds.length === 0) {
      return [];
    }

    // Fetch applet details, filtering out invalid ones
    const pinnedApplets: PinnedApplet[] = [];
    for (const id of appletIds) {
      const applet = await appletManager.readRecord(id);
      if (applet && applet.data.target === "home") {
        pinnedApplets.push({
          id: applet.id,
          label: applet.data.label,
          description: applet.data.description,
          component: applet.data.component,
          app: applet.data.app,
        });
      }
    }

    // Silently clean up invalid applets from saved settings
    if (pinnedApplets.length !== appletIds.length) {
      const validIds = pinnedApplets.map((a) => a.id);
      const table = await settingManager.getTable();
      await settingManager.upsertRecord(table, `${userId}:home:applets`, {
        value: JSON.stringify(validIds),
        name: "home:applets",
        user: userId,
      });
    }

    return pinnedApplets;
  } catch {
    return [];
  }
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
    redirect("/system/login");
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

  const homeMenuItems = await getHomeMenuItems(user.id);
  const pinnedApplets = await getUserPinnedApplets(user.id);

  return (
    <>
      <Navigation
        displayName={user.data.displayName}
        profilePicture={profilePictureUrl}
        isAdmin={hasAdminAuth}
        brandName={brandSettings.brandName}
        brandIcon={brandSettings.brandIcon}
        authorizations={currentUserResult.authorizations.flat()}
        isAssumedIdentity={currentUserResult.isAssumedIdentity}
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
          {pinnedApplets.length > 0 ? (
            <HomeApplets applets={pinnedApplets} />
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
                  Hello, {user.data.displayName}
                </h1>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "16px",
                    marginBottom: "16px",
                  }}
                >
                  Welcome to Applicator
                </p>
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
    </>
  );
}
