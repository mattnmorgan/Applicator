import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFirstTimeSetup } from "@/lib/db";
import { getBrandSettings } from "@/lib/brand";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/Tabset";
import AccessDenied from "@/lib/components/AccessDenied";

// Helper function to recursively sort menu items alphabetically
function sortMenuItems(items: TabsetItem[]): TabsetItem[] {
  return items
    .map((item) => ({
      ...item,
      children: item.children ? sortMenuItems(item.children) : undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getSettingsMenuItems(hasDeveloperAuth: boolean): TabsetItem[] {
  const unsortedSettingsMenuItems: TabsetItem[] = [
    {
      label: "Home",
      path: "/settings",
    },
    {
      label: "Apps",
      path: "/settings/apps",
    },
    {
      label: "User Management",
      clickable: false,
      children: [
        {
          label: "Users",
          path: "/settings/user-management/users",
        },
        {
          label: "Access Management",
          clickable: false,
          children: [
            {
              label: "Authorities",
              path: "/settings/user-management/access-management/authorities",
            },
            {
              label: "Authorizations",
              path: "/settings/user-management/access-management/authorizations",
            },
          ],
        },
      ],
    },
  ];

  // Only add Debug menu if user has developer authorization
  if (hasDeveloperAuth) {
    unsortedSettingsMenuItems.push({
      label: "Debug",
      clickable: false,
      children: [
        {
          label: "Database",
          path: "/settings/debug/database",
        },
        {
          label: "Logs",
          path: "/settings/debug/logs",
        },
        {
          label: "Test",
          clickable: false,
          children: [
            {
              label: "Logs",
              path: "/settings/debug/test/logs",
            },
            {
              label: "Notifications",
              path: "/settings/debug/test/notifications",
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
    redirect("/setup");
  }

  // Check if user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check if user has admin authorization
  const hasAdminAuth = user.authorizations.includes("admin");
  const hasDeveloperAuth = user.authorizations.includes("developer");

  const profilePictureUrl = user.profilePicture
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

  const settingsMenuItems = getSettingsMenuItems(hasDeveloperAuth);

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
