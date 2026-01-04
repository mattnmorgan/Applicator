import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { initializeAuthorities, getApp, updateApp, userHasAuthorization } from "@/lib/db";
import { CURRENT_SYSTEM_VERSION } from "@/app/api/system/version/route";

export async function POST() {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has admin authorization
    const hasAdmin = await userHasAuthorization(user.id, "admin");
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current system app
    const systemApp = await getApp("system");
    if (!systemApp) {
      return NextResponse.json(
        { error: "System app not found" },
        { status: 404 }
      );
    }

    // Check if upgrade is needed
    const dbVersion = systemApp.version;
    const needsUpgrade =
      dbVersion.major < CURRENT_SYSTEM_VERSION.major ||
      (dbVersion.major === CURRENT_SYSTEM_VERSION.major &&
        dbVersion.minor < CURRENT_SYSTEM_VERSION.minor) ||
      (dbVersion.major === CURRENT_SYSTEM_VERSION.major &&
        dbVersion.minor === CURRENT_SYSTEM_VERSION.minor &&
        dbVersion.dev < CURRENT_SYSTEM_VERSION.dev);

    if (!needsUpgrade) {
      return NextResponse.json(
        { error: "System is already up to date" },
        { status: 400 }
      );
    }

    // Run initialization logic (creates authorizations if they don't exist)
    await initializeAuthorities();

    // Update system app version to the current version
    await updateApp("system", {
      version: CURRENT_SYSTEM_VERSION,
    });

    return NextResponse.json({
      success: true,
      oldVersion: `${dbVersion.major}.${dbVersion.minor}.${dbVersion.dev}`,
      newVersion: `${CURRENT_SYSTEM_VERSION.major}.${CURRENT_SYSTEM_VERSION.minor}.${CURRENT_SYSTEM_VERSION.dev}`,
    });
  } catch (error) {
    console.error("System upgrade error:", error);
    return NextResponse.json(
      { error: "Failed to upgrade system" },
      { status: 500 }
    );
  }
}
