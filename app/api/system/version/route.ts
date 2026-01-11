import { NextResponse } from "next/server";
import { getApp } from "@/lib/db";
import { SYSTEM_APP_METADATA } from "@/lib/database/systemMetadata";

// Export current system version from metadata
export const CURRENT_SYSTEM_VERSION = SYSTEM_APP_METADATA.version;

export async function GET() {
  try {
    // Get system app from database
    const systemApp = await getApp("system");

    if (!systemApp) {
      return NextResponse.json(
        { error: "System app not found" },
        { status: 404 }
      );
    }

    // Compare versions
    const dbVersion = systemApp.version;
    const needsUpgrade =
      dbVersion.major < CURRENT_SYSTEM_VERSION.major ||
      (dbVersion.major === CURRENT_SYSTEM_VERSION.major &&
        dbVersion.minor < CURRENT_SYSTEM_VERSION.minor) ||
      (dbVersion.major === CURRENT_SYSTEM_VERSION.major &&
        dbVersion.minor === CURRENT_SYSTEM_VERSION.minor &&
        dbVersion.dev < CURRENT_SYSTEM_VERSION.dev);

    return NextResponse.json({
      currentVersion: CURRENT_SYSTEM_VERSION,
      installedVersion: dbVersion,
      needsUpgrade,
      versionString: `${CURRENT_SYSTEM_VERSION.major}.${CURRENT_SYSTEM_VERSION.minor}.${CURRENT_SYSTEM_VERSION.dev}`,
      installedVersionString: `${dbVersion.major}.${dbVersion.minor}.${dbVersion.dev}`,
    });
  } catch (error) {
    console.error("Error checking system version:", error);
    return NextResponse.json(
      { error: "Failed to check system version" },
      { status: 500 }
    );
  }
}
