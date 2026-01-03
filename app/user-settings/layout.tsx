import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFirstTimeSetup, getAllApps, getAuthority } from "@/lib/db";
import { getBrandSettings } from "@/lib/brand";
import Navigation from "../components/Navigation";
import Tabset, { TabsetItem } from "../components/Tabset";

async function getUserSettingsMenuItems(): Promise<TabsetItem[]> {
  const items: TabsetItem[] = [
    {
      label: "Profile",
      path: "/user-settings/profile",
    },
  ];

  // Get current user to check app access
  const user = await getCurrentUser();
  if (!user) {
    return items;
  }

  // Get user's authority to check which apps they can access
  const authority = await getAuthority(user.authority);
  if (!authority) {
    return items;
  }

  // Get all apps and find those with user-settings widgets
  const allApps = await getAllApps();

  // Filter to apps the user has access to
  const accessibleApps = allApps.filter(
    (app) =>
      authority.apps?.includes(app.id) &&
      app.widgets &&
      app.widgets.some((w) => w.target === "user-settings")
  );

  if (accessibleApps.length > 0) {
    // Build children array for app settings
    const appSettingsChildren: TabsetItem[] = [];

    for (const app of accessibleApps) {
      const settingsWidgets = app.widgets!.filter(
        (w) => w.target === "user-settings"
      );
      for (const widget of settingsWidgets) {
        appSettingsChildren.push({
          label: widget.name,
          path: `/user-settings/widgets/${widget.id}`,
        });
      }
    }

    // Add non-clickable Apps header with children
    items.push({
      label: "Apps",
      clickable: false,
      children: appSettingsChildren,
    });
  }

  return items;
}

export default async function UserSettingsLayout({
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

  const profilePictureUrl = user.profilePicture
    ? `/api/assets/users/icons/${user.id}?t=${Date.now()}`
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
