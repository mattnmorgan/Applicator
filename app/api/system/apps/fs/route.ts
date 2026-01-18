import { NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization } from "@/lib/database/managers/user";
import AuthorityManager from "@/lib/database/managers/authority";
import fs from "fs";
import path from "path";
import os from "os";

async function checkAccess(
  request: Request,
): Promise<{ authorized: boolean; error?: string; status?: number }> {
  // Check user is logged in
  const cookieHeader = request.headers.get("cookie");
  const sessionId = cookieHeader?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  // Check for app authorization header (for app API calls)
  const appId = request.headers.get("X-App-Id");

  if (appId) {
    // App-based access - check if app has fs-access authorization
    const authorityManager = new AuthorityManager();
    const appAuthority = await authorityManager.readAppSpecificAuthority(appId);

    if (
      appAuthority &&
      appAuthority.data.authorizations.includes("system:fs-access")
    ) {
      return { authorized: true };
    }
    return {
      authorized: false,
      error: "App does not have filesystem access",
      status: 403,
    };
  }

  // User-based access - check session and admin authorization
  const hasAdmin = await userHasAuthorization(session.userId, "system:admin");
  if (!hasAdmin) {
    return { authorized: false, error: "Forbidden", status: 403 };
  }

  return { authorized: true };
}

export async function GET(request: Request) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get("path");

    // If no path provided, return drives on Windows or root on Unix
    if (!dir) {
      const platform = os.platform();

      if (platform === "win32") {
        // Get available drives on Windows
        const drives: string[] = [];
        for (let i = 65; i <= 90; i++) {
          const drive = String.fromCharCode(i) + ":";
          try {
            fs.accessSync(drive + "\\");
            drives.push(drive);
          } catch {
            // Drive doesn't exist, skip
          }
        }
        return NextResponse.json({ drives, platform: "win32" });
      } else {
        // Unix-like systems start at root
        return NextResponse.json({ drives: ["/"], platform: "unix" });
      }
    }

    // Read directory contents
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(dir, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ directories, currentPath: dir });
  } catch (error) {
    console.error("Failed to read directory:", error);
    return NextResponse.json(
      { error: "Failed to read directory" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const contentType = request.headers.get("content-type");

    // Handle binary file uploads (multipart/form-data)
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const parentPath = formData.get("path") as string | null;
      const name = formData.get("name") as string | null;

      if (!file || !parentPath || !name) {
        return NextResponse.json(
          { error: "File, path, and name are required" },
          { status: 400 },
        );
      }

      const newPath = path.join(parentPath, name);

      // Create parent directory if it doesn't exist
      const directory = path.dirname(newPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Write binary file
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(newPath, buffer);

      return NextResponse.json({ success: true, path: newPath, type: "file" });
    }

    // Handle JSON-based file/directory creation (text content only)
    const body = await request.json();
    const { path: parentPath, name, type = "directory", content = "" } = body;

    if (!parentPath || !name) {
      return NextResponse.json(
        { error: "Path and name are required" },
        { status: 400 },
      );
    }

    const newPath = path.join(parentPath, name);

    if (type === "file") {
      // Create file with optional content
      fs.writeFileSync(newPath, content, "utf8");
      return NextResponse.json({ success: true, path: newPath, type: "file" });
    } else if (type === "directory") {
      // Create directory
      fs.mkdirSync(newPath, { recursive: true });
      return NextResponse.json({
        success: true,
        path: newPath,
        type: "directory",
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "file" or "directory"' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Failed to create file or directory:", error);
    return NextResponse.json(
      { error: "Failed to create file or directory" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const body = await request.json();
    const { path: targetPath } = body;

    if (!targetPath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Check if path exists
    const stats = fs.statSync(targetPath);

    if (stats.isDirectory()) {
      // Delete directory (recursively)
      fs.rmSync(targetPath, { recursive: true, force: true });
      return NextResponse.json({ success: true, type: "directory" });
    } else if (stats.isFile()) {
      // Delete file
      fs.unlinkSync(targetPath);
      return NextResponse.json({ success: true, type: "file" });
    } else {
      return NextResponse.json(
        { error: "Path is neither a file nor a directory" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Failed to delete:", error);
    return NextResponse.json(
      { error: "Failed to delete file or directory" },
      { status: 500 },
    );
  }
}
