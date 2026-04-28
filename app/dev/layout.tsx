import { redirect } from "next/navigation";
import { getCurrentUser as getUser } from "@/lib/managers/user";
import { getSystemSettings } from "@/lib/managers/setting";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/utility/Tabset";
import AccessDenied from "@/lib/components/utility/AccessDenied";
import SettingsDrawerLayout from "@/lib/components/administration/SettingsDrawerLayout";

async function getCurrentUser() {
  const result = await getUser();
  if (!result) return null;

  return {
    id: result.user.id,
    displayName: result.user.data.display_name,
    icon: result.user.data.icon,
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

const devMenuItems: TabsetItem[] = [
  {
    label: "Development Settings",
    path: "/dev/settings",
  },
  {
    label: "Testing",
    clickable: false,
    children: [
      { label: "API Endpoints", path: "/dev/test/api-endpoints" },
      { label: "Dynamic Inputs", path: "/dev/test/dynamic-inputs" },
      { label: "Logs", path: "/dev/test/logs" },
      { label: "Notifications", path: "/dev/test/notifications" },
      { label: "Form Editor and Viewer", path: "/dev/test/form-editor" },
      { label: "Panels", path: "/dev/test/panels" },
    ],
  },
  {
    label: "Utilities",
    clickable: false,
    children: [
      { label: "Database", path: "/dev/utilities/database" },
      { label: "Elasticsearch", path: "/dev/utilities/elasticsearch" },
    ],
  },
];

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const needsSetup = await isFirstTimeSetup();
  if (needsSetup) {
    redirect("/system/setup");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/system/login");
  }

  const hasAdminAuth = user.authorizations.includes("system:admin");
  const hasDeveloperAuth = user.authorizations.includes("system:developer");

  const profilePictureUrl = user.icon
    ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}`
    : undefined;
  const brandSettings = await getBrandSettings();

  if (!hasDeveloperAuth) {
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
        <AccessDenied message="You do not have permission to access the Development Menu." />
      </>
    );
  }

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
          navTitle="Development Menu"
          nav={
            <Tabset
              items={devMenuItems}
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
