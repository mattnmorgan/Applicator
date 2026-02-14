import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/database/managers/session";
import { userHasAuthorization } from "@/lib/database/managers/user";
import AuthorizationManager from "@/lib/database/managers/authorization";
import { extractAppPackage } from "@/lib/system/installation/package-extractor";
import { validateAppPackage } from "@/lib/system/installation/package-validator";

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

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a .zip package" },
        { status: 400 },
      );
    }

    // Extract and validate package without installing
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const packageData = await extractAppPackage(fileBuffer);
    const { appAttributes } = packageData;

    await validateAppPackage(appAttributes, packageData.zip, {
      isUpgrade: false,
    });

    // Resolve requiredPermissions to names and descriptions
    const permissions: { id: string; name: string; description: string }[] = [];

    if (
      appAttributes.requiredPermissions &&
      appAttributes.requiredPermissions.length > 0
    ) {
      const authorizationManager = new AuthorizationManager();

      for (const permissionId of appAttributes.requiredPermissions) {
        const authorization =
          await authorizationManager.readRecord(permissionId);

        if (!authorization) {
          return NextResponse.json(
            {
              error: `Required permission '${permissionId}' was not found in the system`,
            },
            { status: 400 },
          );
        }

        permissions.push({
          id: permissionId,
          name: authorization.data.name,
          description: authorization.data.description,
        });
      }
    }

    return NextResponse.json({
      appName: appAttributes.name,
      appId: appAttributes.id,
      version: appAttributes.version,
      author: appAttributes.author,
      description: appAttributes.description,
      permissions,
    });
  } catch (error) {
    console.error("Error previewing app:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to preview app",
      },
      {
        status:
          error instanceof Error && error.message.includes("already exists")
            ? 409
            : 500,
      },
    );
  }
}
