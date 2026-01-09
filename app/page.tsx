import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFirstTimeSetup, getUserSubApps, getSubApp } from "@/lib/db";
import { getBrandSettings } from "@/lib/brand";
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
  const subAppIds = await getUserSubApps(userId);

  for (const fullSubAppId of subAppIds) {
    try {
      const subApp = await getSubApp(fullSubAppId);
      if (subApp) {
        homeMenuItems.push({
          label: subApp.label,
          path: `/app/${fullSubAppId}`,
        });
      }
    } catch (error) {
      console.error(`Error loading sub-app ${fullSubAppId}:`, error);
    }
  }

  return homeMenuItems;
}

export default async function HomePage() {
  // Check if first-time setup is needed
  const needsSetup = await isFirstTimeSetup();
  if (needsSetup) {
    redirect("/system/setup");
  }

  // Check if user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profilePictureUrl = user.profilePicture
    ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}`
    : undefined;
  const brandSettings = await getBrandSettings();
  const hasAdminAuth = user.authorizations.includes("admin");

  const homeMenuItems = await getHomeMenuItems(user.id);

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
                Hello, {user.displayName}
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
