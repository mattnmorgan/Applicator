import { redirect } from "next/navigation";
import { getCurrentUser as getUser } from "@/lib/managers/user";
import { getSystemSettings } from "@/lib/managers/setting";
import AppletManager from "@/lib/managers/applet";
import AuthorityManager from "@/lib/managers/authority";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/utility/Tabset";
import AccessDenied from "@/lib/components/utility/AccessDenied";
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

async function getSettingsMenuItems(
  userId: string,
): Promise<TabsetItem[]> {
  const unsortedSettingsMenuItems: TabsetItem[] = [
    {
      label: "System",
      clickable: false,
      children: [
        {
          label: "Settings",
          path: "/system/settings",
        },
        {
          label: "Logs",
          path: "/system/settings/debug/logs",
        },
      ],
    },
    {
      label: "User Management",
      clickable: false,
      children: [
        {
          label: "Users",
          path: "/system/settings/user-management/users",
        },
        {
          label: "Access Management",
          clickable: false,
          children: [
            {
              label: "Authorities",
              path: "/system/settings/user-management/access-management/authorities",
            },
            {
              label: "Authorizations",
              path: "/system/settings/user-management/access-management/authorizations",
            },
            {
              label: "App Access Manager",
              path: "/system/settings/user-management/access-management/app-access",
            },
            {
              label: "Permissions Manager",
              path: "/system/settings/user-management/access-management/permissions",
            },
          ],
        },
      ],
    },
  ];

  // Build App Management section
  const appManagementChildren: TabsetItem[] = [
    {
      label: "Agents",
      path: "/system/settings/agents",
    },
    {
      label: "Apps",
      path: "/system/settings/apps",
    },
    {
      label: "Tables",
      path: "/system/settings/data-models",
    },
  ];

  // Load system-settings applets from apps the user has access to
  const authority = await getAuthority("system:admin"); // Admin users see all system settings
  const userAuthority = await getUserAuthority(userId);

  const appletIds = [
    ...(authority?.apps || []),
    ...(userAuthority?.apps || []),
  ];
  const uniqueAppletIds = [...new Set(appletIds)];

  if (uniqueAppletIds.length > 0) {
    // Get all applets with system-settings target
    const appletManager = new AppletManager();
    const allAppletsResult = await appletManager.readRecords();
    const systemSettingsApplets = allAppletsResult.records.filter(
      (applet) =>
        applet.data.target === "system-settings" &&
        uniqueAppletIds.includes(applet.id),
    );

    const appSettingsChildren: TabsetItem[] = [];

    for (const applet of systemSettingsApplets) {
      appSettingsChildren.push({
        label: applet.data.label,
        path: `/system/settings/applet/${applet.id}`,
      });
    }

    if (appSettingsChildren.length > 0) {
      // Add App Settings as a child of App Management
      appManagementChildren.push({
        label: "App Settings",
        clickable: false,
        children: appSettingsChildren,
      });
    }
  }

  // Add App Management section
  unsortedSettingsMenuItems.push({
    label: "App Management",
    clickable: false,
    children: appManagementChildren,
  });

  return sortMenuItems(unsortedSettingsMenuItems);
}

export default async function SettingsLayout({
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

  // Check if user has admin authorization
  const hasAdminAuth = user.authorizations.includes("system:admin");

  const profilePictureUrl = user.icon
    ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}`
    : undefined;
  const brandSettings = await getBrandSettings();

  if (!hasAdminAuth) {
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
        <AccessDenied message="You do not have permission to access System Settings." />
      </>
    );
  }

  const settingsMenuItems = await getSettingsMenuItems(user.id);

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
          navTitle="System Settings"
          nav={
            <Tabset
              items={settingsMenuItems}
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
