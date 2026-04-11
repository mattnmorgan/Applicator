import fs from "fs";
import fsPromises from "fs/promises";
import nodePath from "path";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import AuthorityManager from "@/lib/managers/authority";
import SettingManager from "@/lib/managers/setting";

export class FilesystemError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "ALREADY_EXISTS"
      | "INVALID_PATH"
      | "INVALID_OPERATION"
      | "PERMISSION_DENIED",
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "FilesystemError";
  }
}

export class Filesystem {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Create a child Filesystem scoped to a subdirectory within this filesystem's root.
   */
  public scoped(subPath: string): Filesystem {
    const resolved = this.resolve(subPath);
    return new Filesystem(resolved);
  }

  // ============================================
  // Path Utilities
  // ============================================

  /**
   * Resolves a relative path within the root directory.
   * Prevents path traversal attacks.
   */
  private resolve(relativePath: string): string {
    const normalizedRelative = nodePath
      .normalize(relativePath || "")
      .replace(/^(\.\.[\/\\])+/, "");
    const resolvedPath = nodePath.join(this.rootPath, normalizedRelative);
    const normalizedBase = nodePath.normalize(this.rootPath);
    const normalizedResolved = nodePath.normalize(resolvedPath);

    if (!normalizedResolved.startsWith(normalizedBase)) {
      throw new FilesystemError(
        "Invalid path: path traversal detected",
        "INVALID_PATH",
        400,
      );
    }

    return resolvedPath;
  }

  /**
   * Converts an absolute path back to a relative path from the root.
   */
  private toRelative(absolutePath: string): string {
    return absolutePath
      .replace(this.rootPath, "")
      .replace(/^[\/\\]/, "")
      .replace(/\\/g, "/");
  }

  // ============================================
  // File Operations
  // ============================================

  /**
   * Check if a file or directory exists
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      await fsPromises.access(this.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file/directory metadata
   */
  public async getMetadata(filePath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    isDirectory: boolean;
  }> {
    try {
      const stats = await fsPromises.stat(this.resolve(filePath));
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
      };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new FilesystemError("File not found", "NOT_FOUND", 404);
      }
      throw error;
    }
  }

  /**
   * Read file contents
   */
  public async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fsPromises.readFile(this.resolve(filePath));
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new FilesystemError("File not found", "NOT_FOUND", 404);
      }
      throw error;
    }
  }

  /**
   * Write file contents (creates parent directories if needed)
   */
  public async writeFile(
    filePath: string,
    content: Buffer | string,
  ): Promise<void> {
    const fullPath = this.resolve(filePath);
    const dir = nodePath.dirname(fullPath);
    await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(fullPath, content);
  }

  /**
   * Delete a file
   */
  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fsPromises.unlink(this.resolve(filePath));
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new FilesystemError("File not found", "NOT_FOUND", 404);
      }
      throw error;
    }
  }

  /**
   * Delete a directory
   */
  public async deleteDirectory(
    dirPath: string,
    recursive: boolean = false,
  ): Promise<void> {
    try {
      await fsPromises.rm(this.resolve(dirPath), {
        recursive,
        force: recursive,
      });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new FilesystemError("Directory not found", "NOT_FOUND", 404);
      }
      throw error;
    }
  }

  /**
   * Create a directory (throws if it already exists)
   */
  public async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolve(dirPath);
    if (await this.exists(dirPath)) {
      throw new FilesystemError(
        "Directory already exists",
        "ALREADY_EXISTS",
        409,
      );
    }
    await fsPromises.mkdir(fullPath, { recursive: true });
  }

  /**
   * Ensure a directory exists (creates if not)
   */
  public async ensureDirectory(dirPath: string): Promise<void> {
    await fsPromises.mkdir(this.resolve(dirPath), { recursive: true });
  }

  /**
   * Ensure the root directory exists
   */
  public async ensureRoot(): Promise<void> {
    await fsPromises.mkdir(this.rootPath, { recursive: true });
  }

  /**
   * List directory contents with metadata
   */
  public async listDirectory(dirPath: string): Promise<
    Array<{
      name: string;
      isDirectory: boolean;
      size: number;
      modifiedAt: Date;
    }>
  > {
    const fullPath = this.resolve(dirPath);

    try {
      await fsPromises.mkdir(fullPath, { recursive: true });
      const entries = await fsPromises.readdir(fullPath, {
        withFileTypes: true,
      });

      const results = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = nodePath.join(fullPath, entry.name);
          try {
            const stats = await fsPromises.stat(entryPath);
            return {
              name: entry.name,
              isDirectory: entry.isDirectory(),
              size: stats.size,
              modifiedAt: stats.mtime,
            };
          } catch {
            return {
              name: entry.name,
              isDirectory: entry.isDirectory(),
              size: 0,
              modifiedAt: new Date(),
            };
          }
        }),
      );

      // Sort: directories first, then by name
      results.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return results;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Rename a file or directory. Returns the new relative path.
   */
  public async rename(filePath: string, newName: string): Promise<string> {
    const fullOldPath = this.resolve(filePath);

    try {
      await fsPromises.access(fullOldPath);
    } catch {
      throw new FilesystemError("File not found", "NOT_FOUND", 404);
    }

    const directory = nodePath.dirname(fullOldPath);
    const newFullPath = nodePath.join(directory, newName);

    try {
      await fsPromises.access(newFullPath);
      throw new FilesystemError(
        "A file with that name already exists",
        "ALREADY_EXISTS",
        409,
      );
    } catch (error) {
      if (error instanceof FilesystemError) throw error;
      // File doesn't exist, which is what we want
    }

    await fsPromises.rename(fullOldPath, newFullPath);
    return this.toRelative(newFullPath);
  }

  /**
   * Move a file or directory to a new location. Returns the new relative path.
   */
  public async move(
    sourcePath: string,
    destinationDir: string,
  ): Promise<string> {
    const fullSource = this.resolve(sourcePath);
    const fullDestDir = this.resolve(destinationDir);

    try {
      await fsPromises.access(fullSource);
    } catch {
      throw new FilesystemError("Source file not found", "NOT_FOUND", 404);
    }

    const fileName = nodePath.basename(fullSource);
    const fullDestPath = nodePath.join(fullDestDir, fileName);

    // Check if moving a directory into itself
    const sourceStats = await fsPromises.stat(fullSource);
    if (sourceStats.isDirectory()) {
      const normalizedSource = nodePath.normalize(fullSource);
      const normalizedDest = nodePath.normalize(fullDestDir);

      if (
        normalizedDest === normalizedSource ||
        normalizedDest.startsWith(normalizedSource + nodePath.sep)
      ) {
        throw new FilesystemError(
          "Cannot move a directory into itself or its subdirectories",
          "INVALID_OPERATION",
          400,
        );
      }
    }

    try {
      await fsPromises.access(fullDestPath);
      throw new FilesystemError(
        "A file with that name already exists in the destination",
        "ALREADY_EXISTS",
        409,
      );
    } catch (error) {
      if (error instanceof FilesystemError) throw error;
    }

    await fsPromises.mkdir(fullDestDir, { recursive: true });
    await fsPromises.rename(fullSource, fullDestPath);
    return this.toRelative(fullDestPath);
  }

  /**
   * Copy a file or directory, handling name conflicts with (copy) suffix.
   * Returns the new relative path.
   */
  public async copy(
    sourcePath: string,
    destinationDir: string,
  ): Promise<string> {
    const fullSource = this.resolve(sourcePath);
    const fullDestDir = this.resolve(destinationDir);

    try {
      await fsPromises.access(fullSource);
    } catch {
      throw new FilesystemError("Source file not found", "NOT_FOUND", 404);
    }

    const sourceStats = await fsPromises.stat(fullSource);
    const isDirectory = sourceStats.isDirectory();
    const fileName = nodePath.basename(fullSource);

    // Check if copying a directory into itself
    if (isDirectory) {
      const normalizedSource = nodePath.normalize(fullSource);
      const normalizedDest = nodePath.normalize(fullDestDir);

      if (
        normalizedDest === normalizedSource ||
        normalizedDest.startsWith(normalizedSource + nodePath.sep)
      ) {
        throw new FilesystemError(
          "Cannot copy a directory into itself or its subdirectories",
          "INVALID_OPERATION",
          400,
        );
      }
    }

    // Generate destination path, handling conflicts
    let fullDestPath = nodePath.join(fullDestDir, fileName);

    try {
      await fsPromises.access(fullDestPath);

      // File exists, generate a conflict-free name
      const lastDotIndex = fileName.lastIndexOf(".");
      let baseName: string;
      let extension: string;

      if (lastDotIndex > 0 && !isDirectory) {
        baseName = fileName.substring(0, lastDotIndex);
        extension = fileName.substring(lastDotIndex);
      } else {
        baseName = fileName;
        extension = "";
      }

      let newFileName = `${baseName} (copy)${extension}`;
      fullDestPath = nodePath.join(fullDestDir, newFileName);

      let counter = 2;
      while (true) {
        try {
          await fsPromises.access(fullDestPath);
          newFileName = `${baseName} (copy ${counter})${extension}`;
          fullDestPath = nodePath.join(fullDestDir, newFileName);
          counter++;
        } catch {
          break; // File doesn't exist, use this name
        }
      }
    } catch {
      // Destination doesn't exist, use original name
    }

    await fsPromises.mkdir(fullDestDir, { recursive: true });

    if (isDirectory) {
      await this.copyDirectoryRecursive(fullSource, fullDestPath);
    } else {
      await this.copyFileSafe(fullSource, fullDestPath);
    }

    return this.toRelative(fullDestPath);
  }

  /**
   * Copy a single file, falling back to a stream-based copy if the OS-level
   * copy_file_range / sendfile syscall is rejected (EPERM/EXDEV) by the
   * filesystem (common on NFS, BTRFS, overlayfs, and external drives).
   */
  private async copyFileSafe(src: string, dest: string): Promise<void> {
    try {
      await fsPromises.copyFile(src, dest);
    } catch (err: any) {
      if (err.code === "EPERM" || err.code === "EXDEV") {
        await new Promise<void>((resolve, reject) => {
          const reader = fs.createReadStream(src);
          const writer = fs.createWriteStream(dest);
          reader.on("error", reject);
          writer.on("error", reject);
          writer.on("close", resolve);
          reader.pipe(writer);
        });
      } else {
        throw err;
      }
    }
  }

  /**
   * Recursively copy a directory
   */
  private async copyDirectoryRecursive(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    await fsPromises.mkdir(destinationPath, { recursive: true });
    const entries = await fsPromises.readdir(sourcePath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const sourceItemPath = nodePath.join(sourcePath, entry.name);
      const destItemPath = nodePath.join(destinationPath, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(sourceItemPath, destItemPath);
      } else {
        await this.copyFileSafe(sourceItemPath, destItemPath);
      }
    }
  }

  /**
   * @param fileName Filename to get content type for
   * @returns Content type for the file name
   */
  public getContentType(fileName: string): string {
    return Filesystem.getContentType(fileName);
  }

  // ============================================
  // Static Utility Methods
  // ============================================

  /**
   * @param fileName Filename to get content type for
   * @returns Content type for the file name
   */
  public static getContentType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    const contentTypeMap: { [key: string]: string } = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      bmp: "image/bmp",
      webp: "image/webp",
      svg: "image/svg+xml",
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "text/javascript",
      json: "application/json",
      xml: "application/xml",
    };

    return contentTypeMap[ext] || "application/octet-stream";
  }

  /**
   * Checks for system-level file system access.
   * Validates session and checks for admin or app-specific fs-access authorization.
   */
  public static async checkFsAccess(request: Request): Promise<{
    authorized: boolean;
    error?: string;
    status?: number;
    /** Set when storage is configured and caller is an app (X-App-Id present).
     *  All paths should be treated as relative to this root. */
    storagePath?: string;
  }> {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = cookieHeader?.match(/session=([^;]+)/)?.[1];

    if (!sessionId) {
      return { authorized: false, error: "Unauthorized", status: 401 };
    }

    const session = await getSession(sessionId);
    if (!session) {
      return { authorized: false, error: "Unauthorized", status: 401 };
    }

    const settingManager = new SettingManager();
    const storageRecord = await settingManager.readRecord("storage");
    const storageConfigured = !!storageRecord?.data.value;
    const hasAdmin = await userHasAuthorization(
      session.user_id,
      "system:admin",
    );

    if (!storageConfigured) {
      // Storage not yet configured — allow admins through so they can
      // browse directories and set the storage path during initial setup.
      if (hasAdmin) {
        return { authorized: true };
      }
      return {
        authorized: false,
        error: "System storage not configured",
        status: 503,
      };
    }

    const url = new URL(request.url);
    const appId =
      request.headers.get("X-App-Id") || url.searchParams.get("appId");

    if (appId) {
      const authorityManager = new AuthorityManager();
      const appAuthority =
        await authorityManager.readAppSpecificAuthority(appId);

      if (
        appAuthority &&
        appAuthority.data.authorizations.includes("system:fs-access")
      ) {
        const storagePath = ((storageRecord?.data.value as string) || "").replace(/\\/g, "/");
        return { authorized: true, storagePath };
      }
      return {
        authorized: false,
        error: "App does not have filesystem access",
        status: 403,
      };
    } else {
      if (hasAdmin) {
        return { authorized: true };
      } else {
        return { authorized: false, error: "Forbidden", status: 403 };
      }
    }
  }
}
