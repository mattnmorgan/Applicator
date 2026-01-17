import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/managers/user";
import AuthorityManager from "@/lib/database/managers/authority";
import AppletManager from "@/lib/database/managers/applet";

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
    const mainAuthority = await authorityManager.readRecord(
      user.data.authority
    );
    const userAuthority = await authorityManager.readUserAuthority(user.id);

    const authorizations = new Set<string>();
    if (mainAuthority) {
      mainAuthority.data.authorizations.forEach((auth) =>
        authorizations.add(auth)
      );
    }
    if (userAuthority) {
      userAuthority.data.authorizations.forEach((auth) =>
        authorizations.add(auth)
      );
    }

    // Get applet IDs from user's authorities
    const appletIds = [
      ...(mainAuthority?.data.apps || []),
      ...(userAuthority?.data.apps || []),
    ];
    const uniqueAppletIds = [...new Set(appletIds)];

    // Get applet details
    const appletManager = new AppletManager();
    const allAppletsResult = await appletManager.readRecords();
    const userApplets = allAppletsResult.records
      .filter((applet) => uniqueAppletIds.includes(applet.id))
      .map((applet) => ({
        id: applet.id,
        label: applet.data.label,
        description: applet.data.description,
        target: applet.data.target,
        app: applet.data.app,
      }));

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.data.displayName,
        username: user.data.username,
        email: user.data.email,
        authority: user.data.authority,
        isAdmin: authorizations.has("system:admin"),
        profilePicture: profilePictureUrl,
      },
      authorizations: Array.from(authorizations),
      userApplets, // Array of applets with full details
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
