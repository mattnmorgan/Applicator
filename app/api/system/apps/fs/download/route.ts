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

function resolveAppPath(storagePath: string, relPath: string): string {
  if (!relPath) return path.resolve(storagePath);
  if (path.isAbsolute(relPath) || /^[A-Za-z]:[\\/]/.test(relPath)) {
    throw Object.assign(new Error("Absolute paths are not allowed in app mode"), { status: 400 });
  }
  const normalized = path.normalize(relPath).replace(/^(\.\.[\\/])+/, "");
  const resolved = path.resolve(storagePath, normalized);
  const base = path.resolve(storagePath);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw Object.assign(new Error("Path traversal detected"), { status: 400 });
  }
  return resolved;
}

function serveFile(absoluteFilePath: string, inline: boolean): NextResponse {
  if (!fs.existsSync(absoluteFilePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stats = fs.statSync(absoluteFilePath);
  if (stats.isDirectory()) {
    return NextResponse.json({ error: "Cannot download a directory" }, { status: 400 });
  }

  const fileBuffer = fs.readFileSync(absoluteFilePath);
  const fileName = path.basename(absoluteFilePath);
  const mimeType = getMimeType(absoluteFilePath);

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Content-Length": String(fileBuffer.length),
  };

  if (!inline) {
    headers["Content-Disposition"] = `attachment; filename="${fileName}"`;
  }

  return new NextResponse(fileBuffer, { headers });
}

// GET — admin-only (absolute path in query param)
export async function GET(request: Request) {
  const access = await Filesystem.checkFsAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // App-mode callers must use POST { path, inline? } instead.
  if (access.storagePath) {
    return NextResponse.json(
      { error: "App-mode requests must use POST with { path, inline? }" },
      { status: 405 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    const inline = searchParams.get("inline") === "true";

    if (!filePath) {
      return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
    }

    return serveFile(filePath, inline);
  } catch (error) {
    console.error("Failed to download file:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}

// POST — app-mode download/preview (path in request body, never in URL)
export async function POST(request: Request) {
  const access = await Filesystem.checkFsAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { path: filePath, inline = false } = body;

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    let absoluteFilePath: string;
    if (access.storagePath) {
      try {
        absoluteFilePath = resolveAppPath(access.storagePath, filePath);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: e.status || 400 });
      }
    } else {
      absoluteFilePath = filePath;
    }

    return serveFile(absoluteFilePath, inline);
  } catch (error) {
    console.error("Failed to download file:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
