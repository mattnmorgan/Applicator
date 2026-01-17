import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/database/managers/setting";
import path from "path";
import fs from "fs/promises";

const contentTypeMap: { [key: string]: string } = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".js": "application/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".html": "text/html",
  ".txt": "text/plain",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; path: string[] }> }
) {
  try {
    const { appId, path: pathSegments } = await params;

    // Get storage path
    const storagePath = (await getSystemSettings()).storage;
    if (!storagePath) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 }
      );
    }

    let filePath: string;

    // Handle system app assets with special routing
    if (appId === "system") {
      if (pathSegments.length === 1 && pathSegments[0] === "brand") {
        filePath = path.join(storagePath, "apps", "system", "brand.png");
      } else if (
        pathSegments.length === 3 &&
        pathSegments[0] === "icons" &&
        ["authorities", "users"].includes(pathSegments[1])
      ) {
        const id = pathSegments[2];
        filePath = path.join(
          storagePath,
          "apps",
          "system",
          "icons",
          pathSegments[1],
          `${id}.png`
        );
      } else {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
      }
    } else {
      if (pathSegments.length === 1 && pathSegments[0] === "icon") {
        filePath = path.join(storagePath, "apps", appId, "app.png");
      } else if (pathSegments.length === 1 && pathSegments[0] === "source") {
        filePath = path.join(storagePath, "apps", appId, "app.js");
      } else {
        filePath = path.join(storagePath, "apps", appId, ...pathSegments);
      }
    }

    // Security check: ensure the resolved path is within the storage directory
    const resolvedPath = path.resolve(filePath);
    const resolvedStoragePath = path.resolve(storagePath);
    if (!resolvedPath.startsWith(resolvedStoragePath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    try {
      const content = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = contentTypeMap[ext] || "application/octet-stream";

      return new NextResponse(content, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error serving app asset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
