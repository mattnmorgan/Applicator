import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/managers/setting";
import AppManager from "@/lib/managers/app";
import { versionDir } from "@/lib/system/version";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

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
        const jpgPath = path.join(brandDir, "brand.jpg");
        const pngPath = path.join(brandDir, "brand.png");
        try {
          await fs.access(jpgPath);
          filePath = jpgPath;
        } catch {
          // Lazy migrate brand.png → brand.jpg
          await fs.access(pngPath); // throws 404 if neither exists
          const resized = await sharp(await fs.readFile(pngPath))
            .resize(64, 64, { fit: "cover" })
            .jpeg({ quality: 85 })
            .toBuffer();
          await fs.mkdir(brandDir, { recursive: true });
          await fs.writeFile(jpgPath, resized);
          await fs.unlink(pngPath);
          filePath = jpgPath;
        }
      } else if (
        pathSegments.length === 3 &&
        pathSegments[0] === "icons" &&
        ["authorities", "users"].includes(pathSegments[1])
      ) {
        const id = pathSegments[2];
        const iconDir = path.join(storagePath, "apps", "system", "icons", pathSegments[1]);
        const jpgPath = path.join(iconDir, `${id}.jpg`);
        const pngPath = path.join(iconDir, `${id}.png`);

        // Try .jpg first
        try {
          await fs.access(jpgPath);
          filePath = jpgPath;
        } catch {
          // Lazy migrate .png → .jpg
          try {
            await fs.access(pngPath);
            const resized = await sharp(await fs.readFile(pngPath))
              .resize(64, 64, { fit: "cover" })
              .jpeg({ quality: 85 })
              .toBuffer();
            await fs.mkdir(iconDir, { recursive: true });
            await fs.writeFile(jpgPath, resized);
            await fs.unlink(pngPath);
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
