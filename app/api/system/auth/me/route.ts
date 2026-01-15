import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getUserSubApps,
  getSubApp,
  parseSubAppId,
  getUserAuthorizations,
} from "@/lib/database/helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profilePictureUrl = user.icon
      ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}`
      : undefined;

    // Get user's authorizations
    const { authorizations } = await getUserAuthorizations(user.id);

    // Get sub-app IDs from user's authorities
    const subAppIds = await getUserSubApps(user.id);

    // Map sub-app IDs to their full details
    const userSubApps: Array<{
      id: string;
      label: string;
      mainAppId: string;
      subAppId: string;
    }> = [];
    const mainAppIds = new Set<string>();

    for (const fullSubAppId of subAppIds) {
      try {
        const { mainAppId, subAppId } = parseSubAppId(fullSubAppId);
        const subApp = await getSubApp(fullSubAppId);

        if (subApp) {
          userSubApps.push({
            id: fullSubAppId,
            label: subApp.label,
            mainAppId,
            subAppId,
          });
          mainAppIds.add(mainAppId);
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
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        authority: user.authority,
        isAdmin: authorizations.includes("admin"),
        profilePicture: profilePictureUrl,
      },
      authorizations,
      userSubApps, // New: array of sub-apps with full details
      userMainApps, // New: array of main app IDs (derived)
      isAssumedIdentity: user.isAssumedIdentity,
    });
  } catch (error) {
    console.error("Failed to get current user:", error);
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    );
  }
}
