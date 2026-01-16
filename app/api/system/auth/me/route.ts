import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/managers/user";
import AuthorityManager from "@/lib/database/managers/authority";
import AppManager from "@/lib/database/managers/app";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = currentUser.user;
    const profilePictureUrl = user.data.icon
      ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}`
      : undefined;

    // Get user's authorizations
    const authorityManager = new AuthorityManager();
    const mainAuthority = await authorityManager.readRecord(user.data.authority);
    const userAuthority = await authorityManager.readUserAuthority(user.id);

    const authorizations = new Set<string>();
    if (mainAuthority) {
      mainAuthority.data.authorizations.forEach(auth => authorizations.add(auth));
    }
    if (userAuthority) {
      userAuthority.data.authorizations.forEach(auth => authorizations.add(auth));
    }

    // Get sub-app IDs from user's authorities
    const subAppIds = [
      ...(mainAuthority?.data.apps || []),
      ...(userAuthority?.data.apps || []),
    ];
    const uniqueSubAppIds = [...new Set(subAppIds)];

    // Map sub-app IDs to their full details
    const userSubApps: Array<{
      id: string;
      label: string;
      mainAppId: string;
      subAppId: string;
    }> = [];
    const mainAppIds = new Set<string>();
    const appManager = new AppManager();

    for (const fullSubAppId of uniqueSubAppIds) {
      try {
        const parts = fullSubAppId.split(":");
        if (parts.length !== 2) {
          console.error(`Invalid sub-app ID format: ${fullSubAppId}`);
          continue;
        }

        const [mainAppId, subAppId] = parts;
        const app = await appManager.readRecord(mainAppId);

        if (app && app.data.subApps) {
          const subApp = app.data.subApps.find((sa) => sa.id === subAppId);
          if (subApp) {
            userSubApps.push({
              id: fullSubAppId,
              label: subApp.label,
              mainAppId,
              subAppId,
            });
            mainAppIds.add(mainAppId);
          }
        }
      } catch (error) {
        // Skip invalid sub-app IDs
        console.error(`Invalid sub-app ID: ${fullSubAppId}`, error);
      }
    }

    // Get unique main app IDs for backward compatibility
    const userMainApps = Array.from(mainAppIds);

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.data.displayName,
        username: user.data.username,
        email: user.data.email,
        authority: user.data.authority,
        isAdmin: authorizations.has("admin"),
        profilePicture: profilePictureUrl,
      },
      authorizations: Array.from(authorizations),
      userSubApps, // New: array of sub-apps with full details
      userMainApps, // New: array of main app IDs (derived)
      isAssumedIdentity: currentUser.isAssumedIdentity,
    });
  } catch (error) {
    console.error("Failed to get current user:", error);
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    );
  }
}
