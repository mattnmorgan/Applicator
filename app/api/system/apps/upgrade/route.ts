import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/database/managers/session";
import { userHasAuthorization } from "@/lib/database/managers/user";
import LogManager from "@/lib/database/managers/log";
import {
  upgradeApp,
  upgradeSystemApp,
} from "@/lib/system/installation/app-installer";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin authorization
    const hasAdmin = await userHasAuthorization(session.user_id, "system:admin");
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const appId = formData.get("appId") as string;

    if (!appId) {
      return NextResponse.json(
        { error: "No app ID provided" },
        { status: 400 }
      );
    }

    // Special handling for system app upgrade without file
    const isSystemApp = appId === "system";

    if (isSystemApp && !file) {
      // Upgrade system app using metadata
      const result = await upgradeSystemApp();

      return NextResponse.json({
        success: true,
        appId: result.appId,
        name: result.name,
        oldVersion: result.oldVersion,
        newVersion: result.newVersion,
      });
    }

    // Normal app upgrade requires a file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check if file is a zip
    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a .zip package" },
        { status: 400 }
      );
    }

    // Read file as buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Use the upgradeApp helper to handle the upgrade
    const result = await upgradeApp(appId, fileBuffer);

    return NextResponse.json({
      success: true,
      appId: result.appId,
      name: result.name,
      oldVersion: result.oldVersion,
      newVersion: result.newVersion,
    });
  } catch (error) {
    console.error("Error upgrading app:", error);

    // Log upgrade failure
    try {
      await new LogManager().error(
        "system",
        `App upgrade failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } catch (logError) {
      console.error("Failed to log upgrade error:", logError);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      {
        status:
          error instanceof Error && error.message.includes("does not exist")
            ? 404
            : 500,
      }
    );
  }
}
