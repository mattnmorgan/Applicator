import { NextRequest, NextResponse } from "next/server";
import ApiRouteManager from "@/lib/database/managers/apiRoute";
import SettingManager from "@/lib/database/managers/setting";
import AuthorityManager from "@/lib/database/managers/authority";
import ContextualAuthorityManager from "@/lib/database/managers/contextualAuthority";
import Context from "@/lib/sdk/plugin-context";
import { getSession } from "@/lib/database/managers/session";
import * as path from "path";
import * as fs from "fs";
import { loadModule } from "@/lib/system/source";
import bcrypt from "bcryptjs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> },
) {
  return handleRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> },
) {
  return handleRequest(request, params, "POST");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> },
) {
  return handleRequest(request, params, "PATCH");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> },
) {
  return handleRequest(request, params, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> },
) {
  return handleRequest(request, params, "DELETE");
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ appId: string; path: string[] }>,
  method: string,
) {
  try {
    const { appId, path: routePath } = await params;
    const route = routePath.join("/");

    // Find matching API route from database
    const apiRouteManager = new ApiRouteManager();
    const apiRouteId = `${appId}:${route}:${method}`;
    const apiRouteRecord = await apiRouteManager.readRecord(apiRouteId);

    if (!apiRouteRecord) {
      return NextResponse.json(
        { error: "API route not found" },
        { status: 404 },
      );
    }

    const apiRoute = apiRouteRecord.data;

    // Get system storage path
    const settingManager = new SettingManager();
    const storageSetting = await settingManager.readRecord("storage");
    const storagePath = storageSetting?.data.value;
    if (!storagePath) {
      return NextResponse.json(
        { error: "System storage not configured" },
        { status: 500 },
      );
    }

    // Load the handler from the app's API directory in system storage
    const fileName = routePath[routePath.length - 1];
    const folders = routePath.slice(0, -1);

    // Build the full path: storage/apps/{appId}/api/{folders}/{fileName}.js
    const handlerPath = path.join(
      storagePath,
      "apps",
      appId,
      "api",
      ...folders,
      `${fileName}.js`,
    );

    // Check if file exists
    if (!fs.existsSync(handlerPath)) {
      return NextResponse.json(
        { error: "Handler file not found", path: handlerPath },
        { status: 500 },
      );
    }

    // Load the handler dynamically
    const handlerModule = loadModule(handlerPath);
    const handler = handlerModule[method];

    if (!handler || typeof handler !== "function") {
      return NextResponse.json(
        { error: "Handler function not found" },
        { status: 500 },
      );
    }

    // Determine context: guest or authenticated
    const guestContextId = request.headers.get("X-Guest-Context");
    let plugin;

    if (guestContextId) {
      // Guest access path
      const caManager = new ContextualAuthorityManager();
      const caRecord = await caManager.readRecord(guestContextId);
      if (!caRecord || caRecord.data.app !== appId) {
        return NextResponse.json(
          { error: "Invalid or expired guest link" },
          { status: 403 },
        );
      }

      const ca = caRecord.data;

      // Validate password if required
      if (ca.password) {
        const guestPassword = request.headers.get("X-Guest-Password");
        if (!guestPassword) {
          return NextResponse.json(
            { error: "Password required" },
            { status: 401 },
          );
        }
        const passwordMatch = await bcrypt.compare(guestPassword, ca.password);
        if (!passwordMatch) {
          return NextResponse.json(
            { error: "Incorrect password" },
            { status: 403 },
          );
        }
      }

      // Check app has guest-accessible permission
      const authorityManager = new AuthorityManager();
      const appAuthority =
        await authorityManager.readAppSpecificAuthority(appId);
      if (
        !appAuthority ||
        !appAuthority.data.authorizations.includes("system:guest-accessible")
      ) {
        return NextResponse.json(
          { error: "App does not support guest access" },
          { status: 403 },
        );
      }

      // Parse context data
      let contextData = null;
      if (ca.context) {
        try {
          contextData = JSON.parse(ca.context);
        } catch {
          contextData = null;
        }
      }

      plugin = await Context.create(appId, null, { id: guestContextId, data: contextData });
    } else {
      // Authenticated access path
      const sessionId = request.cookies.get("session")?.value;
      let userId: string | undefined;

      if (sessionId) {
        const session = await getSession(sessionId);
        if (session) {
          userId = session.userId;
        }
      }

      plugin = await Context.create(appId, userId);
    }

    const context = { plugin };

    // Execute the handler with context
    return await handler(request, context);
  } catch (error) {
    console.error("Error handling app API request:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
