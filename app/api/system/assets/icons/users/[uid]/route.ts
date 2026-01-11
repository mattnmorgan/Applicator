import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSystemSettings } from "@/lib/database/managers/setting";
import UserManager from "@/lib/database/managers/user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    // Get user to find their profile picture path
    const user = await new UserManager().readRecord(uid);

    if (!user || !user.data.profilePicture) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Get system storage path
    const systemStorage = (await getSystemSettings()).storage;

    if (!systemStorage) {
      return new NextResponse("System storage not configured", { status: 500 });
    }

    // Build full path to profile picture
    const fullPath = path.join(systemStorage, user.data.profilePicture);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(fullPath);

    // Determine content type based on file extension
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
    console.error("Failed to serve profile picture:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
