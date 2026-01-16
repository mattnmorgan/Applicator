import { NextResponse, NextRequest } from "next/server";
import { getSystemSettings } from "@/lib/database/managers/setting";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization, setSystemSetting, getSystemSetting, getApp } from "@/lib/database/helpers";
import { SYSTEM_APP_METADATA } from "@/lib/database/systemMetadata";
import path from "path";
import fs from "fs/promises";

export async function GET(request: NextRequest) {
  try {
    const settings = await getSystemSettings();

    // Get version information
    const systemApp = await getApp("system");
    let versionInfo = null;

    if (systemApp) {
      const installedVersion = systemApp.data.version;
      const currentVersion = SYSTEM_APP_METADATA.version;

      const isUpgradeable =
        installedVersion.major < currentVersion.major ||
        (installedVersion.major === currentVersion.major &&
          installedVersion.minor < currentVersion.minor) ||
        (installedVersion.major === currentVersion.major &&
          installedVersion.minor === currentVersion.minor &&
          installedVersion.dev < currentVersion.dev);

      versionInfo = {
        currentVersion,
        currentVersionString: `${currentVersion.major}.${currentVersion.minor}.${currentVersion.dev}`,
        installedVersion,
        installedVersionString: `${installedVersion.major}.${installedVersion.minor}.${installedVersion.dev}`,
        isUpgradeable,
      };
    }

    return NextResponse.json(
      {
        settings,
        version: versionInfo
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAdmin = await userHasAuthorization(session.userId, "admin");
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if this is a FormData request (for brand icon upload)
    const contentType = request.headers.get("content-type");
    const isFormData = contentType?.includes("multipart/form-data");

    if (isFormData) {
      // Handle brand settings with file upload
      const formData = await request.formData();
      const brandName = formData.get("brandName") as string;
      const brandIcon = formData.get("brandIcon") as File | null;
      const clearBrandIcon = formData.get("clearBrandIcon") as string | null;

      if (brandName) {
        await setSystemSetting("brandName", brandName);
      }

      // Handle brand icon clear
      if (clearBrandIcon === "true") {
        const storagePath = await getSystemSetting("storage");
        if (storagePath) {
          const logoPath = path.join(storagePath, "brand", "logo.png");
          try {
            await fs.unlink(logoPath);
          } catch (error) {
            // File doesn't exist, that's ok
          }
        }
        await setSystemSetting("brandIcon", "");
      }

      // Handle logo upload if provided
      if (brandIcon && brandIcon.size > 0) {
        const storagePath = await getSystemSetting("storage");
        if (storagePath) {
          const logoDir = path.join(storagePath, "brand");
          await fs.mkdir(logoDir, { recursive: true });

          const logoPath = path.join(logoDir, "logo.png");
          const logoBuffer = Buffer.from(await brandIcon.arrayBuffer());
          await fs.writeFile(logoPath, logoBuffer);

          // Set brandIcon setting to relative path
          await setSystemSetting("brandIcon", "brand/logo.png");
        }
      }

      return NextResponse.json({
        success: true,
        brandName: brandName || await getSystemSetting("brandName")
      });
    } else {
      // Handle JSON settings (storage, logging, etc.)
      const body = await request.json();

      // Update each setting provided in the request
      for (const [key, value] of Object.entries(body)) {
        if (key === "storage" && typeof value === "string") {
          await setSystemSetting("storage", value);
        } else if (key === "loggingEnabled" && typeof value === "boolean") {
          await setSystemSetting("loggingEnabled", String(value));
        } else if (key === "brandName" && typeof value === "string") {
          await setSystemSetting("brandName", value);
        }
      }

      return NextResponse.json({ success: true, ...body });
    }
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
