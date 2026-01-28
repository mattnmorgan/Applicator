import { NextResponse } from "next/server";
import { checkFsAccess } from "@/lib/system/filesystem";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(request: Request) {
  const access = await checkFsAccess(request);
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

    // Check if directory exists
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ files: [], currentPath: dir });
    }

    // Read directory contents with full metadata
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      const isDirectory = entry.isDirectory();

      let size = 0;
      let modifiedAt = new Date().toISOString();

      try {
        const stats = fs.statSync(fullPath);
        size = stats.size;
        modifiedAt = stats.mtime.toISOString();
      } catch {
        // Ignore stat errors
      }

      return {
        name: entry.name,
        path: fullPath.replace(/\\/g, "/"),
        size: isDirectory ? 0 : size,
        modifiedAt,
        isDirectory,
      };
    });

    // Sort: directories first, then by name
    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ files, currentPath: dir });
  } catch (error) {
    console.error("Failed to read directory:", error);
    return NextResponse.json(
      { error: "Failed to read directory" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const access = await checkFsAccess(request);
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
  const access = await checkFsAccess(request);
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

// POST handler for rename, move, and copy operations
export async function POST(request: Request) {
  const access = await checkFsAccess(request);
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const body = await request.json();
    const { operation, sourcePath, destinationPath, newName } = body;

    if (!operation) {
      return NextResponse.json(
        { error: "Operation is required" },
        { status: 400 },
      );
    }

    switch (operation) {
      case "rename": {
        if (!sourcePath || !newName) {
          return NextResponse.json(
            { error: "sourcePath and newName are required for rename" },
            { status: 400 },
          );
        }

        const parentDir = path.dirname(sourcePath);
        const newPath = path.join(parentDir, newName);

        if (fs.existsSync(newPath)) {
          return NextResponse.json(
            { error: "A file or directory with that name already exists" },
            { status: 400 },
          );
        }

        fs.renameSync(sourcePath, newPath);
        return NextResponse.json({ success: true, path: newPath });
      }

      case "move": {
        if (!sourcePath || !destinationPath) {
          return NextResponse.json(
            { error: "sourcePath and destinationPath are required for move" },
            { status: 400 },
          );
        }

        // Check if source is a directory and destination is inside it
        const normalizedSource = path.resolve(sourcePath).replace(/\\/g, "/");
        const normalizedDest = path.resolve(destinationPath).replace(/\\/g, "/");

        if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isDirectory()) {
          if (
            normalizedDest === normalizedSource ||
            normalizedDest.startsWith(normalizedSource + "/")
          ) {
            return NextResponse.json(
              { error: "Cannot move a folder into itself" },
              { status: 400 },
            );
          }
        }

        const fileName = path.basename(sourcePath);
        const newPath = path.join(destinationPath, fileName);

        if (fs.existsSync(newPath)) {
          return NextResponse.json(
            { error: "A file or directory with that name already exists at destination" },
            { status: 400 },
          );
        }

        // Ensure destination directory exists
        if (!fs.existsSync(destinationPath)) {
          fs.mkdirSync(destinationPath, { recursive: true });
        }

        fs.renameSync(sourcePath, newPath);
        return NextResponse.json({ success: true, path: newPath });
      }

      case "copy": {
        if (!sourcePath || !destinationPath) {
          return NextResponse.json(
            { error: "sourcePath and destinationPath are required for copy" },
            { status: 400 },
          );
        }

        // Check if source is a directory and destination is inside it
        const normalizedCopySource = path.resolve(sourcePath).replace(/\\/g, "/");
        const normalizedCopyDest = path.resolve(destinationPath).replace(/\\/g, "/");

        if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isDirectory()) {
          if (
            normalizedCopyDest === normalizedCopySource ||
            normalizedCopyDest.startsWith(normalizedCopySource + "/")
          ) {
            return NextResponse.json(
              { error: "Cannot copy a folder into itself" },
              { status: 400 },
            );
          }
        }

        const sourceFileName = path.basename(sourcePath);
        const newPath = path.join(destinationPath, sourceFileName);

        // Ensure destination directory exists
        if (!fs.existsSync(destinationPath)) {
          fs.mkdirSync(destinationPath, { recursive: true });
        }

        const stats = fs.statSync(sourcePath);
        if (stats.isDirectory()) {
          // Recursive copy for directories
          copyDirectorySync(sourcePath, newPath);
        } else {
          fs.copyFileSync(sourcePath, newPath);
        }

        return NextResponse.json({ success: true, path: newPath });
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Failed to perform operation:", error);
    return NextResponse.json(
      { error: "Failed to perform operation" },
      { status: 500 },
    );
  }
}

function copyDirectorySync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
