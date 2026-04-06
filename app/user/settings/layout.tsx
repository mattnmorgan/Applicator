import { redirect } from "next/navigation";
import { getCurrentUser as getUser } from "@/lib/managers/user";
import { getSystemSettings } from "@/lib/managers/setting";
import AppletManager from "@/lib/managers/applet";
import AuthorityManager from "@/lib/managers/authority";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/utility/Tabset";
import SettingsDrawerLayout from "@/lib/components/administration/SettingsDrawerLayout";

// Inlined helper functions
async function getCurrentUser() {
  const result = await getUser();
  if (!result) return null;

  return {
    id: result.user.id,
    displayName: result.user.data.display_name,
    username: result.user.data.username,
    email: result.user.data.email,
    icon: result.user.data.icon,
    authority: result.user.data.authority_id,
    authorizations: result.authorizations.flat(),
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
  const userManager = new (await import("@/lib/managers/user")).default();
  const users = await userManager.listRecords();
  return users.length === 0;
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
      label: "Homescreen",
      path: "/user/settings/home",
    },
    {
      label: "Notifications",
      path: "/user/settings/notifications",
    },
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

  // Get user's authority and user authority to check which applets they can access
  const authority = await getAuthority(user.authority);
  const userAuthority = await getUserAuthority(user.id);

  // Combine applet IDs from both authority and user authority
  const appletIds = [
    ...(authority?.apps || []),
    ...(userAuthority?.apps || []),
  ];
  const uniqueAppletIds = [...new Set(appletIds)];

  if (uniqueAppletIds.length === 0) {
    return items;
  }

  // Get all applets with user-settings target
  const appletManager = new AppletManager();
  const allAppletsResult = await appletManager.readRecords();
  const userSettingsApplets = allAppletsResult.records.filter(
    (applet) =>
      applet.data.target === "user-settings" &&
      uniqueAppletIds.includes(applet.id),
  );

  // Build children array for app settings
  const appSettingsChildren: TabsetItem[] = [];

  for (const applet of userSettingsApplets) {
    appSettingsChildren.push({
      label: applet.data.label,
      path: `/user/settings/applet/${applet.id}`,
    });
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
  const hasAdminAuth = user.authorizations.includes("system:admin");
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
          height: "100vh",
          background: "#0f172a",
          paddingTop: "84px",
          paddingLeft: "20px",
          paddingRight: "20px",
          paddingBottom: "20px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <SettingsDrawerLayout
          navTitle="User Settings"
          nav={
            <Tabset
              items={userSettingsMenuItems}
              variant="vertical"
              searchable
              autoExpand
            />
          }
        >
          {children}
        </SettingsDrawerLayout>
      </div>
    </>
  );
}
