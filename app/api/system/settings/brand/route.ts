import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization, getSystemSetting, setSystemSetting } from "@/lib/database/helpers";
import path from "path";
import fs from "fs/promises";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brandName = await getSystemSetting("brandName");
    const brandIcon = await getSystemSetting("brandIcon");

    return NextResponse.json({
      brandName: brandName || "Applicator",
      brandIcon: brandIcon ? `/api/system/assets/brand?t=${Date.now()}` : undefined
    });
  } catch (error) {
    console.error("Error fetching brand settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
  } catch (error) {
    console.error("Error updating brand settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
