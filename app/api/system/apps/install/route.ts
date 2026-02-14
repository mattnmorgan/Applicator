import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/database/managers/session";
import { userHasAuthorization } from "@/lib/database/managers/user";
import LogManager from "@/lib/database/managers/log";
import { installApp } from "@/lib/system/installation/app-installer";

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
    const file = formData.get("file") as File;

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

    // Read approved permissions if provided
    const approvedPermissionsRaw = formData.get("approvedPermissions") as string | null;
    let approvedPermissions: string[] | undefined;
    if (approvedPermissionsRaw) {
      try {
        approvedPermissions = JSON.parse(approvedPermissionsRaw);
      } catch {
        return NextResponse.json(
          { error: "Invalid approvedPermissions format" },
          { status: 400 }
        );
      }
    }

    // Use the installApp helper to handle the installation
    const result = await installApp(fileBuffer, approvedPermissions);

    return NextResponse.json({
      success: true,
      appId: result.appId,
      name: result.name,
    });
  } catch (error) {
    console.error("Error installing app:", error);

    // Log installation failure
    try {
      await new LogManager().error(
        "system",
        `App installation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } catch (logError) {
      console.error("Failed to log installation error:", logError);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      {
        status:
          error instanceof Error && error.message.includes("already exists")
            ? 409
            : 500,
      }
    );
  }
}
