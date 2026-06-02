import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import LogManager from "@/lib/managers/log";
import {
  upgradeApp,
  upgradeSystemApp,
} from "@/lib/system/installation/app-installer";
import { extractAppPackage } from "@/lib/system/installation/package-extractor";

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
    const hasAdmin = await userHasAuthorization(
      session.user_id,
      "system:admin",
    );
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let appId = formData.get("appId") as string | null;

    // Parse approved permissions if provided
    const approvedPermissionsRaw = formData.get("approvedPermissions") as string | null;
    let approvedPermissions: string[] | undefined;
    if (approvedPermissionsRaw) {
      try {
        approvedPermissions = JSON.parse(approvedPermissionsRaw);
      } catch {
        return NextResponse.json(
          { error: "Invalid approvedPermissions format" },
          { status: 400 },
        );
      }
    }

    // If no appId provided but a file is present, derive it from the package
    if (!appId && file) {
      if (!file.name.endsWith(".zip")) {
        return NextResponse.json(
          { error: "Invalid file format. Please upload a .zip package" },
          { status: 400 },
        );
      }
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const packageData = await extractAppPackage(fileBuffer);
      appId = packageData.appAttributes.id;
      // Re-wrap the buffer so we don't read the stream twice
      const result = await upgradeApp(appId, fileBuffer, approvedPermissions);
      return NextResponse.json({
        success: true,
        appId: result.appId,
        name: result.name,
        oldVersion: result.oldVersion,
        newVersion: result.newVersion,
      });
    }

    if (!appId) {
      return NextResponse.json(
        { error: "No app ID provided" },
        { status: 400 },
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
        { status: 400 },
      );
    }

    // Read file as buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Use the upgradeApp helper to handle the upgrade
    const result = await upgradeApp(appId, fileBuffer, approvedPermissions);

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
        }`,
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
      },
    );
  }
}
