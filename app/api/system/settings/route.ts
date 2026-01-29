import { NextResponse, NextRequest } from "next/server";
import { getSystemSettings } from "@/lib/database/managers/setting";
import { getSession } from "@/lib/database/managers/session";
import { SYSTEM_APP_METADATA } from "@/lib/database/systemMetadata";
import SettingManager from "@/lib/database/managers/setting";
import AppManager from "@/lib/database/managers/app";
import { userHasAuthorization } from "@/lib/database/managers/user";
import path from "path";
import fs from "fs/promises";

export async function GET() {
  try {
    const settings = await getSystemSettings();

    // Get version information
    let systemApp;
    let versionInfo = null;

    try {
      const appManager = new AppManager();
      systemApp = await appManager.readRecord("system");
    } catch (e) {
      systemApp = null;
    }

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
        version: versionInfo,
        setup: {
          complete: versionInfo !== null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 },
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

    // Check if user has admin authorization
    const hasAdmin = await userHasAuthorization(session.userId, "system:admin");
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settingManager = new SettingManager();
    const table = await settingManager.getTable();

    // Helper function to upsert a setting
    const setSetting = async (key: string, value: string) => {
      await settingManager.upsertRecord(table, key, { value });
    };

    // Helper function to get a setting
    const getSetting = async (key: string): Promise<string | undefined> => {
      const record = await settingManager.readRecord(key);
      return record?.data.value;
    };

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
        await setSetting("brandName", brandName);
      }

      // Handle brand icon clear
      if (clearBrandIcon === "true") {
        const storagePath = await getSetting("storage");
        if (storagePath) {
          const logoPath = path.join(
            storagePath,
            "apps",
            "system",
            "brand.png",
          );
          try {
            await fs.unlink(logoPath);
          } catch (error) {
            // File doesn't exist, that's ok
          }
        }
        await setSetting("brandIcon", "");
      }

      // Handle logo upload if provided
      if (brandIcon && brandIcon.size > 0) {
        const storagePath = await getSetting("storage");
        if (storagePath) {
          const logoDir = path.join(storagePath, "apps", "system");
          await fs.mkdir(logoDir, { recursive: true });

          const logoPath = path.join(logoDir, "brand.png");
          const logoBuffer = Buffer.from(await brandIcon.arrayBuffer());
          await fs.writeFile(logoPath, logoBuffer);

          // Set brandIcon setting to indicate brand exists
          await setSetting("brandIcon", "true");
        }
      }

      return NextResponse.json({
        success: true,
        brandName: brandName || (await getSetting("brandName")),
      });
    } else {
      // Handle JSON settings (storage, logging, etc.)
      const body = await request.json();

      // Update each setting provided in the request
      for (const [key, value] of Object.entries(body)) {
        if (key === "storage" && typeof value === "string") {
          await setSetting("storage", value);
        } else if (key === "loggingEnabled" && typeof value === "boolean") {
          await setSetting("loggingEnabled", String(value));
        } else if (key === "brandName" && typeof value === "string") {
          await setSetting("brandName", value);
        }
      }

      return NextResponse.json({ success: true, ...body });
    }
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
