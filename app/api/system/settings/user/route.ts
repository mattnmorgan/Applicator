import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/managers/user";
import UserManager from "@/lib/managers/user";
import SettingManager from "@/lib/managers/setting";
import AuthorityManager from "@/lib/managers/authority";
import AppletManager from "@/lib/managers/applet";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

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
      user.data.authority_id,
    );
    const userAuthority = await authorityManager.readUserAuthority(user.id);

    const authorizations = new Set<string>();
    if (mainAuthority) {
      mainAuthority.data.authorizations.forEach((auth) =>
        authorizations.add(auth),
      );
    }
    if (userAuthority) {
      userAuthority.data.authorizations.forEach((auth) =>
        authorizations.add(auth),
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
        displayName: user.data.display_name,
        username: user.data.username,
        email: user.data.email,
        authority: user.data.authority_id,
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
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUserResult = await getCurrentUser();

    if (!currentUserResult) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const currentUser = currentUserResult.user;
    const formData = await request.formData();

    const displayName = formData.get("displayName") as string;
    const email = formData.get("email") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const profilePictureFile = formData.get("profilePicture") as File | null;
    const clearProfilePicture = formData.get("clearProfilePicture") === "true";

    if (!displayName || !email) {
      return NextResponse.json(
        { error: "Display name and email are required" },
        { status: 400 },
      );
    }

    // Verify current password if changing password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 },
        );
      }

      const passwordMatch = await bcrypt.compare(
        currentPassword,
        currentUser.data.password_hash,
      );
      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      }
    }

    // Build updates object (use snake_case column names)
    const updates: any = {
      display_name: displayName,
      email,
    };

    // Update password if provided
    if (newPassword) {
      updates.password_hash = await bcrypt.hash(newPassword, 10);
    }

    // Handle clearing profile picture
    if (clearProfilePicture) {
      updates.icon = undefined;
    }

    // Handle profile picture upload if provided
    if (profilePictureFile) {
      const settingManager = new SettingManager();
      const storageSetting = await settingManager.readRecord("storage");
      const systemStorage = storageSetting?.data.value;

      if (!systemStorage) {
        return NextResponse.json(
          { error: "System storage not configured" },
          { status: 500 },
        );
      }

      // Create directory structure
      const userIconsDir = path.join(
        systemStorage,
        "apps",
        "system",
        "icons",
        "users",
      );

      if (!fs.existsSync(userIconsDir)) {
        fs.mkdirSync(userIconsDir, { recursive: true });
      }

      // Save as {uid}.png
      const fileName = `${currentUser.id}.png`;
      const filePath = path.join(userIconsDir, fileName);

      const buffer = Buffer.from(await profilePictureFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      // Set icon flag
      updates.icon = "true";
    }

    // Update user
    const userManager = new UserManager();
    await userManager.updateRecord(
      await userManager.getTable(),
      currentUser.id,
      {
        ...currentUser.data,
        ...updates,
      },
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
