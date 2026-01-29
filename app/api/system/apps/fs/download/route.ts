import { NextResponse } from "next/server";
import { Filesystem } from "@/lib/system/filesystem";
import fs from "fs";
import path from "path";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".xml": "application/xml",
    ".zip": "application/zip",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".wav": "audio/wav",
    ".csv": "text/csv",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

export async function GET(request: Request) {
  const access = await Filesystem.checkFsAccess(request);
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    const inline = searchParams.get("inline") === "true";

    if (!filePath) {
      return NextResponse.json(
        { error: "Path parameter is required" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      return NextResponse.json(
        { error: "Cannot download a directory" },
        { status: 400 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const mimeType = getMimeType(filePath);

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": String(fileBuffer.length),
    };

    if (!inline) {
      headers["Content-Disposition"] = `attachment; filename="${fileName}"`;
    }

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("Failed to download file:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
