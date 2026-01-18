import { NextRequest, NextResponse } from "next/server";
import ApiRouteManager from "@/lib/database/managers/apiRoute";
import SettingManager from "@/lib/database/managers/setting";
import { createPlugin, getSession } from "@/lib/sdk";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";

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

    // Use createRequire to load the handler dynamically
    // This bypasses Next.js static analysis
    const require = createRequire(import.meta.url || __filename);
    const absolutePath = path.resolve(handlerPath);

    // Clear cache to ensure fresh load
    delete require.cache[absolutePath];
    const handlerModule = require(absolutePath);
    const handler = handlerModule[method];

    if (!handler || typeof handler !== "function") {
      return NextResponse.json(
        { error: "Handler function not found" },
        { status: 500 },
      );
    }

    // Get session for user context (optional)
    const sessionId = request.cookies.get("session")?.value;
    let userId: string | undefined;

    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        userId = session.userId;
      }
    }

    // Create plugin context
    const plugin = await createPlugin(appId, userId);
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
