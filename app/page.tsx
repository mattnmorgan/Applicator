import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getSystemSettings } from "@/lib/database/managers/setting";
import UserManager from "@/lib/database/managers/user";
import AuthorityManager from "@/lib/database/managers/authority";
import AppManager from "@/lib/database/managers/app";
import Navigation from "@/lib/components/Navigation";
import Tabset, { TabsetItem } from "@/lib/components/Tabset";

async function getHomeMenuItems(userId: string): Promise<TabsetItem[]> {
  const homeMenuItems: TabsetItem[] = [
    {
      label: "Home",
      path: "/",
    },
  ];

  // Get user's accessible sub-apps
  const authorityManager = new AuthorityManager();
  const userManager = new UserManager();
  const appManager = new AppManager();

  const userRecord = await userManager.readRecord(userId);
  if (!userRecord) return homeMenuItems;

  const mainAuthority = await authorityManager.readRecord(userRecord.data.authority);
  const userAuthority = await authorityManager.readUserAuthority(userId);

  const subAppIds = [
    ...(mainAuthority?.data.apps || []),
    ...(userAuthority?.data.apps || []),
  ];
  const uniqueSubAppIds = [...new Set(subAppIds)];

  for (const fullSubAppId of uniqueSubAppIds) {
    try {
      const parts = fullSubAppId.split(":");
      if (parts.length !== 2) continue;

      const [mainAppId, subAppId] = parts;
      const app = await appManager.readRecord(mainAppId);

      if (app && app.data.subApps) {
        const subApp = app.data.subApps.find((sa) => sa.id === subAppId);
        if (subApp) {
          homeMenuItems.push({
            label: subApp.label,
            path: `/app/${fullSubAppId}`,
          });
        }
      }
    } catch (error) {
      console.error(`Error loading sub-app ${fullSubAppId}:`, error);
    }
  }

  return homeMenuItems;
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
    brandIcon: settings.brandIcon ? `/api/system/assets/brand?t=${Date.now()}` : undefined,
  };

  const hasAdminAuth = currentUserResult.authorizations.flat().includes("admin");

  const homeMenuItems = await getHomeMenuItems(user.id);

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
                }}
              >
                Welcome to Applicator
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
