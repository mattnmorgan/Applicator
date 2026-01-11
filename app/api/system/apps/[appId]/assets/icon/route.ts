import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/database/managers/setting";
import path from "path";
import fs from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    // Get storage path
    const storagePath = (await getSystemSettings()).storage;
    if (!storagePath) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 }
      );
    }

    // Get the icon file from app directory
    const iconPath = path.join(storagePath, "apps", appId, "app.png");

    try {
      const content = await fs.readFile(iconPath);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error) {
      // Return a default icon or 404
      return NextResponse.json({ error: "Icon not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error serving app icon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
