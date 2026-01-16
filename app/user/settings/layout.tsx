import { redirect } from "next/navigation";
import { getCurrentUser as getUser } from "@/lib/database/managers/user";
import { getSystemSettings } from "@/lib/database/managers/setting";
import AppManager from "@/lib/database/managers/app";
import AuthorityManager from "@/lib/database/managers/authority";
import { SubApp } from "@/lib/database/types/app";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/Tabset";

// Inlined helper functions
async function getCurrentUser() {
  const result = await getUser();
  if (!result) return null;

  return {
    id: result.user.id,
    displayName: result.user.data.displayName,
    username: result.user.data.username,
    email: result.user.data.email,
    icon: result.user.data.icon,
    authority: result.user.data.authority,
    authorizations: result.authorizations.flat(),
    authorities: result.authorities,
    isAssumedIdentity: result.isAssumedIdentity,
  };
}

async function getBrandSettings() {
  const settings = await getSystemSettings();
  return {
    brandName: settings.brandName || "Applicator",
    brandIcon: settings.brandIcon,
  };
}

async function isFirstTimeSetup(): Promise<boolean> {
  const userManager = new (
    await import("@/lib/database/managers/user")
  ).default();
  const users = await userManager.listRecords();
  return users.length === 0;
}

function parseSubAppId(fullSubAppId: string): {
  mainAppId: string;
  subAppId: string;
} {
  const parts = fullSubAppId.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid sub-app ID format: ${fullSubAppId}`);
  }
  return {
    mainAppId: parts[0],
    subAppId: parts[1],
  };
}

async function getSubApp(
  fullSubAppId: string
): Promise<(SubApp & { mainAppId: string; fullId: string }) | null> {
  try {
    const { mainAppId, subAppId } = parseSubAppId(fullSubAppId);
    const appManager = new AppManager();
    const app = await appManager.readRecord(mainAppId);

    if (!app || !app.data.subApps) return null;

    const subApp = app.data.subApps.find((sa) => sa.id === subAppId);
    if (!subApp) return null;

    return {
      ...subApp,
      mainAppId,
      fullId: fullSubAppId,
    };
  } catch (error) {
    console.error(`Error getting sub-app ${fullSubAppId}:`, error);
    return null;
  }
}

async function getAuthority(authorityId: string) {
  const authorityManager = new AuthorityManager();
  const authority = await authorityManager.readRecord(authorityId);
  return authority?.data || null;
}

async function getUserAuthority(userId: string) {
  const authorityManager = new AuthorityManager();
  const authority = await authorityManager.readUserAuthority(userId);
  return authority?.data || null;
}

// Helper function to recursively sort menu items alphabetically
function sortMenuItems(items: TabsetItem[]): TabsetItem[] {
  return items
    .map((item) => ({
      ...item,
      children: item.children ? sortMenuItems(item.children) : undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function getUserSettingsMenuItems(): Promise<TabsetItem[]> {
  const items: TabsetItem[] = [
    {
      label: "Profile",
      path: "/user/settings/profile",
    },
  ];

  // Get current user to check app access
  const user = await getCurrentUser();
  if (!user) {
    return items;
  }

  // Get user's authority and user authority to check which sub-apps they can access
  const authority = await getAuthority(user.authority);
  const userAuthority = await getUserAuthority(user.id);

  // Combine sub-app IDs from both authority and user authority
  const subAppIds = [
    ...(authority?.apps || []),
    ...(userAuthority?.apps || []),
  ];

  if (subAppIds.length === 0) {
    return items;
  }

  // Build children array for app settings
  const appSettingsChildren: TabsetItem[] = [];

  // For each sub-app, get its widgets that target user-settings
  for (const fullSubAppId of subAppIds) {
    try {
      const subApp = await getSubApp(fullSubAppId);
      if (!subApp || !subApp.widgets) {
        continue;
      }

      // Parse the full sub-app ID to get mainAppId and subAppId
      const { mainAppId, subAppId } = parseSubAppId(fullSubAppId);

      // Filter widgets that target user-settings
      const settingsWidgets = subApp.widgets.filter(
        (w) => w.target === "user-settings"
      );

      for (const widget of settingsWidgets) {
        // Create composite widget ID: mainAppId:subAppId:widgetId
        const compositeWidgetId = `${mainAppId}:${subAppId}:${widget.id}`;
        appSettingsChildren.push({
          label: widget.name,
          path: `/user/settings/widgets/${compositeWidgetId}`,
        });
      }
    } catch (error) {
      // Skip invalid sub-app IDs
      console.error(`Error loading sub-app ${fullSubAppId}:`, error);
    }
  }

  if (appSettingsChildren.length > 0) {
    // Add non-clickable Apps header with children
    items.push({
      label: "Apps",
      clickable: false,
      children: appSettingsChildren,
    });
  }

  return sortMenuItems(items);
}

export default async function UserSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if first-time setup is needed
  const needsSetup = await isFirstTimeSetup();
  if (needsSetup) {
    redirect("/system/setup");
  }

  // Check if user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect("/system/login");
  }

  const profilePictureUrl = user.icon
    ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}`
    : undefined;
  const hasAdminAuth = user.authorizations.includes("admin");
  const brandSettings = await getBrandSettings();
  const userSettingsMenuItems = await getUserSettingsMenuItems();

  return (
    <>
      <Navigation
        displayName={user.displayName}
        profilePicture={profilePictureUrl}
        isAdmin={hasAdminAuth}
        brandName={brandSettings.brandName}
        brandIcon={brandSettings.brandIcon}
        authorizations={user.authorizations}
        isAssumedIdentity={user.isAssumedIdentity}
      />
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          background: "#0f172a",
          paddingTop: "84px",
          paddingLeft: "20px",
          paddingRight: "20px",
          paddingBottom: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "20px",
            height: "calc(100vh - 104px)",
          }}
        >
          <aside
            style={{
              width: "250px",
              background: "#1e293b",
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid #334155",
              overflowY: "auto",
            }}
          >
            <Tabset
              items={userSettingsMenuItems}
              variant="vertical"
              searchable
              autoExpand
            />
          </aside>
          <main
            style={{
              flex: 1,
              background: "#1e293b",
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid #334155",
              overflowY: "auto",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
