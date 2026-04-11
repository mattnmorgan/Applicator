import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/managers/setting";
import AppManager from "@/lib/managers/app";
import { versionDir } from "@/lib/system/version";
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
  { params }: { params: Promise<{ appId: string; path: string[] }> },
) {
  try {
    const { appId, path: pathSegments } = await params;
    const storagePath = (await getSystemSettings()).storage;
    let filePath: string;
    let skipValidation: boolean = false;

    // Handle system app assets with special routing
    if (appId === "system") {
      if (pathSegments.length === 1 && pathSegments[0] === "icon") {
        // Serve the static system icon from the public folder
        filePath = path.join(
          process.cwd(),
          "public",
          "assets",
          "icons",
          "system.png",
        );
        skipValidation = true;
      } else if (pathSegments.length === 1 && pathSegments[0] === "brand") {
        const brandDir = path.join(storagePath, "apps", "system");
        const pngPath = path.join(brandDir, "brand.png");
        const jpgPath = path.join(brandDir, "brand.jpg");
        try {
          await fs.access(pngPath);
          filePath = pngPath;
        } catch {
          // Fall back to legacy .jpg
          await fs.access(jpgPath); // throws 404 if neither exists
          filePath = jpgPath;
        }
      } else if (
        pathSegments.length === 3 &&
        pathSegments[0] === "icons" &&
        ["authorities", "users"].includes(pathSegments[1])
      ) {
        const id = pathSegments[2];
        const iconDir = path.join(storagePath, "apps", "system", "icons", pathSegments[1]);
        const pngPath = path.join(iconDir, `${id}.png`);
        const jpgPath = path.join(iconDir, `${id}.jpg`);

        // Try .png first (new), fall back to legacy .jpg
        try {
          await fs.access(pngPath);
          filePath = pngPath;
        } catch {
          try {
            await fs.access(jpgPath);
            filePath = jpgPath;
          } catch {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
          }
        }
      } else {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
      }
    } else {
      // Look up the app record to resolve the active version directory
      const appRecord = await new AppManager().readRecord(appId);
      if (!appRecord) {
        return NextResponse.json({ error: "App not found" }, { status: 404 });
      }
      const vDir = versionDir(appRecord.data.version);

      if (pathSegments.length === 1 && pathSegments[0] === "icon") {
        filePath = path.join(storagePath, "apps", appId, vDir, "app.png");
      } else if (pathSegments.length === 1 && pathSegments[0] === "source") {
        filePath = path.join(storagePath, "apps", appId, vDir, "app.js");
      } else {
        filePath = path.join(storagePath, "apps", appId, vDir, ...pathSegments);
      }
    }

    // Skip validation if a specific file in the public assets is requested
    if (!skipValidation) {
      if (!storagePath) {
        return NextResponse.json(
          { error: "Storage not configured" },
          { status: 500 },
        );
      }

      // Security check: ensure the resolved path is within the storage directory or public folder
      const resolvedPath = path.resolve(filePath);
      const resolvedStoragePath = path.resolve(storagePath);
      const resolvedPublicPath = path.resolve(process.cwd(), "public");
      const isInStorage = resolvedPath.startsWith(resolvedStoragePath);
      const isInPublic = resolvedPath.startsWith(resolvedPublicPath);

      if (!isInStorage && !isInPublic) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
      }
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
      { status: 500 },
    );
  }
}
