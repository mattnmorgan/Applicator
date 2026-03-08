import { NextResponse } from "next/server";
import { Filesystem } from "@/lib/system/filesystem";
import fs from "fs";
import path from "path";
import os from "os";

class AppPathError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

/**
 * Resolve a storage-relative path to an absolute path, preventing traversal.
 * Throws AppPathError if the path is absolute or attempts traversal.
 */
function resolveAppPath(storagePath: string, relPath: string): string {
  if (!relPath) return path.resolve(storagePath);
  if (path.isAbsolute(relPath) || /^[A-Za-z]:[\\/]/.test(relPath)) {
    throw new AppPathError("Absolute paths are not allowed in app mode");
  }
  const normalized = path.normalize(relPath).replace(/^(\.\.[\\/])+/, "");
  const resolved = path.resolve(storagePath, normalized);
  const base = path.resolve(storagePath);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new AppPathError("Path traversal detected");
  }
  return resolved;
}

/**
 * Convert an absolute path back to a storage-relative path (forward slashes).
 */
function toRelPath(storagePath: string, absolutePath: string): string {
  const base = path.resolve(storagePath);
  const abs = path.resolve(absolutePath);
  if (abs === base) return "";
  return abs.startsWith(base + path.sep)
    ? abs.slice(base.length + 1).replace(/\\/g, "/")
    : abs.replace(/\\/g, "/");
}

/**
 * Shared directory listing logic.
 * @param absoluteDir Absolute path to the directory to list.
 * @param storagePath If set, paths in the response are returned relative to this root.
 */
function listDirectoryContents(
  absoluteDir: string,
  storagePath?: string,
): NextResponse {
  if (!fs.existsSync(absoluteDir)) {
    const currentPath = storagePath
      ? toRelPath(storagePath, absoluteDir)
      : absoluteDir.replace(/\\/g, "/");
    return NextResponse.json({ files: [], currentPath });
  }

  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = entries.map((entry) => {
    const fullPath = path.join(absoluteDir, entry.name);
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

    const returnPath = storagePath
      ? toRelPath(storagePath, fullPath)
      : fullPath.replace(/\\/g, "/");

    return {
      name: entry.name,
      path: returnPath,
      size: isDirectory ? 0 : size,
      modifiedAt,
      isDirectory,
    };
  });

  files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  const currentPath = storagePath
    ? toRelPath(storagePath, absoluteDir)
    : absoluteDir.replace(/\\/g, "/");

  return NextResponse.json({ files, currentPath });
}

// GET — admin-only filesystem browser (absolute paths, no X-App-Id required)
export async function GET(request: Request) {
  const access = await Filesystem.checkFsAccess(request);
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  // App-mode callers must use POST { operation: "list", path } instead.
  if (access.storagePath) {
    return NextResponse.json(
      { error: "App-mode requests must use POST with operation: 'list'" },
      { status: 405 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get("path");

    // No path → list drives / root
    if (!dir) {
      const platform = os.platform();
      if (platform === "win32") {
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
        return NextResponse.json({ drives: ["/"], platform: "unix" });
      }
    }

    return listDirectoryContents(dir);
  } catch (error) {
    console.error("Failed to read directory:", error);
    return NextResponse.json(
      { error: "Failed to read directory" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const access = await Filesystem.checkFsAccess(request);
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

      if (!file || parentPath === null || !name) {
        return NextResponse.json(
          { error: "File, path, and name are required" },
          { status: 400 },
        );
      }

      let absParent: string;
      if (access.storagePath) {
        try {
          absParent = resolveAppPath(access.storagePath, parentPath);
        } catch (e: any) {
          return NextResponse.json(
            { error: e.message },
            { status: e.status || 400 },
          );
        }
      } else {
        absParent = parentPath;
      }

      const newPath = path.join(absParent, name);
      const directory = path.dirname(newPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(newPath, buffer);

      const returnPath = access.storagePath
        ? toRelPath(access.storagePath, newPath)
        : newPath;
      return NextResponse.json({ success: true, path: returnPath, type: "file" });
    }

    // Handle JSON-based file/directory creation
    const body = await request.json();
    const { path: parentPath, name, type = "directory", content = "" } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Path and name are required" },
        { status: 400 },
      );
    }

    let absParent: string;
    if (access.storagePath) {
      try {
        absParent = resolveAppPath(access.storagePath, parentPath || "");
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message },
          { status: e.status || 400 },
        );
      }
    } else {
      if (!parentPath) {
        return NextResponse.json(
          { error: "Path and name are required" },
          { status: 400 },
        );
      }
      absParent = parentPath;
    }

    const newPath = path.join(absParent, name);

    if (type === "file") {
      fs.writeFileSync(newPath, content, "utf8");
      const returnPath = access.storagePath
        ? toRelPath(access.storagePath, newPath)
        : newPath;
      return NextResponse.json({ success: true, path: returnPath, type: "file" });
    } else if (type === "directory") {
      fs.mkdirSync(newPath, { recursive: true });
      const returnPath = access.storagePath
        ? toRelPath(access.storagePath, newPath)
        : newPath;
      return NextResponse.json({ success: true, path: returnPath, type: "directory" });
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
  const access = await Filesystem.checkFsAccess(request);
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

    let absTargetPath: string;
    if (access.storagePath) {
      try {
        absTargetPath = resolveAppPath(access.storagePath, targetPath);
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message },
          { status: e.status || 400 },
        );
      }
    } else {
      absTargetPath = targetPath;
    }

    const stats = fs.statSync(absTargetPath);

    if (stats.isDirectory()) {
      fs.rmSync(absTargetPath, { recursive: true, force: true });
      return NextResponse.json({ success: true, type: "directory" });
    } else if (stats.isFile()) {
      fs.unlinkSync(absTargetPath);
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

// POST — directory listing (operation: "list") + rename/move/copy operations
export async function POST(request: Request) {
  const access = await Filesystem.checkFsAccess(request);
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const body = await request.json();
    const { operation, path: listPath, sourcePath, destinationPath, newName } = body;

    if (!operation) {
      return NextResponse.json(
        { error: "Operation is required" },
        { status: 400 },
      );
    }

    // Resolve paths for app mode
    let absSourcePath = sourcePath;
    let absDestPath = destinationPath;
    if (access.storagePath) {
      try {
        if (sourcePath) absSourcePath = resolveAppPath(access.storagePath, sourcePath);
        if (destinationPath) absDestPath = resolveAppPath(access.storagePath, destinationPath);
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message },
          { status: e.status || 400 },
        );
      }
    }

    switch (operation) {
      case "list": {
        let absoluteDir: string;
        if (access.storagePath) {
          try {
            absoluteDir = resolveAppPath(access.storagePath, listPath || "");
          } catch (e: any) {
            return NextResponse.json(
              { error: e.message },
              { status: e.status || 400 },
            );
          }
        } else {
          if (!listPath) {
            return NextResponse.json(
              { error: "Path is required for list operation in admin mode" },
              { status: 400 },
            );
          }
          absoluteDir = listPath;
        }
        return listDirectoryContents(absoluteDir, access.storagePath);
      }

      case "rename": {
        if (!absSourcePath || !newName) {
          return NextResponse.json(
            { error: "sourcePath and newName are required for rename" },
            { status: 400 },
          );
        }

        const parentDir = path.dirname(absSourcePath);
        const newPath = path.join(parentDir, newName);

        if (fs.existsSync(newPath)) {
          return NextResponse.json(
            { error: "A file or directory with that name already exists" },
            { status: 400 },
          );
        }

        fs.renameSync(absSourcePath, newPath);
        const returnPath = access.storagePath
          ? toRelPath(access.storagePath, newPath)
          : newPath;
        return NextResponse.json({ success: true, path: returnPath });
      }

      case "move": {
        if (!absSourcePath || !absDestPath) {
          return NextResponse.json(
            { error: "sourcePath and destinationPath are required for move" },
            { status: 400 },
          );
        }

        const normalizedSource = path.resolve(absSourcePath).replace(/\\/g, "/");
        const normalizedDest = path.resolve(absDestPath).replace(/\\/g, "/");

        if (fs.existsSync(absSourcePath) && fs.statSync(absSourcePath).isDirectory()) {
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

        const fileName = path.basename(absSourcePath);
        const newPath = path.join(absDestPath, fileName);

        if (fs.existsSync(newPath)) {
          return NextResponse.json(
            { error: "A file or directory with that name already exists at destination" },
            { status: 400 },
          );
        }

        if (!fs.existsSync(absDestPath)) {
          fs.mkdirSync(absDestPath, { recursive: true });
        }

        fs.renameSync(absSourcePath, newPath);
        const returnPath = access.storagePath
          ? toRelPath(access.storagePath, newPath)
          : newPath;
        return NextResponse.json({ success: true, path: returnPath });
      }

      case "copy": {
        if (!absSourcePath || !absDestPath) {
          return NextResponse.json(
            { error: "sourcePath and destinationPath are required for copy" },
            { status: 400 },
          );
        }

        const normalizedCopySource = path.resolve(absSourcePath).replace(/\\/g, "/");
        const normalizedCopyDest = path.resolve(absDestPath).replace(/\\/g, "/");

        if (fs.existsSync(absSourcePath) && fs.statSync(absSourcePath).isDirectory()) {
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

        const sourceFileName = path.basename(absSourcePath);
        const newPath = path.join(absDestPath, sourceFileName);

        if (!fs.existsSync(absDestPath)) {
          fs.mkdirSync(absDestPath, { recursive: true });
        }

        const stats = fs.statSync(absSourcePath);
        if (stats.isDirectory()) {
          copyDirectorySync(absSourcePath, newPath);
        } else {
          fs.copyFileSync(absSourcePath, newPath);
        }

        const returnPath = access.storagePath
          ? toRelPath(access.storagePath, newPath)
          : newPath;
        return NextResponse.json({ success: true, path: returnPath });
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
