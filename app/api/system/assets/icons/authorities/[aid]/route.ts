import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import SettingManager from "@/lib/database/managers/setting";
import AuthorityManager from "@/lib/database/managers/authority";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ aid: string }> }
) {
  try {
    const { aid } = await params;

    // Get authority to find their icon path
    const authorityRecord = await new AuthorityManager().readRecord(aid);

    if (!authorityRecord || !authorityRecord.data.icon) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Read raw storage setting value
    const settingManager = new SettingManager();
    const storageRecord = await settingManager.readRecord("storage");
    const systemStorage = storageRecord?.data.value;

    if (!systemStorage) {
      return new NextResponse("Storage not configured", { status: 500 });
    }

    const fullPath = path.join(systemStorage, authorityRecord.data.icon);

    if (!fs.existsSync(fullPath)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    const contentTypeMap: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    const contentType = contentTypeMap[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to serve authority icon:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
