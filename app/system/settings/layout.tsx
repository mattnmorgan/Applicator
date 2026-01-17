import { redirect } from "next/navigation";
import { getCurrentUser as getUser } from "@/lib/database/managers/user";
import { getSystemSettings } from "@/lib/database/managers/setting";
import AppletManager from "@/lib/database/managers/applet";
import AuthorityManager from "@/lib/database/managers/authority";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/Tabset";
import AccessDenied from "@/lib/components/AccessDenied";

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
  hasDeveloperAuth: boolean,
  userId: string
): Promise<TabsetItem[]> {
  const unsortedSettingsMenuItems: TabsetItem[] = [
    {
      label: "Home",
      path: "/system/settings",
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
          ],
        },
      ],
    },
  ];

  // Build App Management section
  const appManagementChildren: TabsetItem[] = [
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
  const authority = await getAuthority("admin"); // Admin users see all system settings
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
        uniqueAppletIds.includes(applet.id)
    );

    const appSettingsChildren: TabsetItem[] = [];

    for (const applet of systemSettingsApplets) {
      appSettingsChildren.push({
        label: applet.data.label,
        path: `/system/settings/apps/widgets/${applet.id}`,
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

  // Only add Debug menu if user has developer authorization
  if (hasDeveloperAuth) {
    unsortedSettingsMenuItems.push({
      label: "Debug",
      clickable: false,
      children: [
        {
          label: "Api Endpoints",
          path: "/system/settings/debug/api-endpoints",
        },
        {
          label: "Database",
          path: "/system/settings/debug/database",
        },
        {
          label: "Logs",
          path: "/system/settings/debug/logs",
        },
        {
          label: "Test",
          clickable: false,
          children: [
            {
              label: "Logs",
              path: "/system/settings/debug/test/logs",
            },
            {
              label: "Notifications",
              path: "/system/settings/debug/test/notifications",
            },
          ],
        },
      ],
    });
  }

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
  const hasAdminAuth = user.authorizations.includes("admin");
  const hasDeveloperAuth = user.authorizations.includes("developer");

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

  const settingsMenuItems = await getSettingsMenuItems(
    hasDeveloperAuth,
    user.id
  );

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
              items={settingsMenuItems}
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
