/**
 * File API for Vibe Applicator Plugins
 *
 * Provides sandboxed file system access for plugins.
 * Each app has its own directory under system/files/[app-id]/
 */

import fs from 'fs/promises';
import path from 'path';
import { getSystemSetting } from '../db';

export class FileManager {
  private appId: string;

  constructor(appId: string) {
    this.appId = appId;
  }

  /**
   * Get the base directory for this app's files
   */
  private async getAppDirectory(): Promise<string> {
    const storagePath = await getSystemSetting('storage');
    if (!storagePath) {
      throw new Error('System storage not configured');
    }

    const appDir = path.join(storagePath, 'files', this.appId);

    // Ensure the directory exists
    await fs.mkdir(appDir, { recursive: true });

    return appDir;
  }

  /**
   * Resolve a file path within the app's directory
   * Prevents path traversal attacks
   */
  private async resolvePath(filePath: string): Promise<string> {
    const appDir = await this.getAppDirectory();
    const resolvedPath = path.resolve(appDir, filePath);

    // Ensure the resolved path is within the app directory
    if (!resolvedPath.startsWith(appDir)) {
      throw new Error('Invalid file path: path traversal not allowed');
    }

    return resolvedPath;
  }

  /**
   * Create or replace a file
   * @param filePath Relative path within the app's directory
   * @param content File content (string or Buffer)
   */
  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const resolvedPath = await this.resolvePath(filePath);

    // Ensure parent directory exists
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(resolvedPath, content);
  }

  /**
   * Read a file
   * @param filePath Relative path within the app's directory
   * @returns File content as Buffer
   */
  async readFile(filePath: string): Promise<Buffer> {
    const resolvedPath = await this.resolvePath(filePath);

    try {
      return await fs.readFile(resolvedPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Read a file as text
   * @param filePath Relative path within the app's directory
   * @param encoding Text encoding (default: utf-8)
   */
  async readFileText(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const buffer = await this.readFile(filePath);
    return buffer.toString(encoding);
  }

  /**
   * Delete a file
   * @param filePath Relative path within the app's directory
   */
  async deleteFile(filePath: string): Promise<void> {
    const resolvedPath = await this.resolvePath(filePath);

    try {
      await fs.unlink(resolvedPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Check if a file exists
   * @param filePath Relative path within the app's directory
   */
  async exists(filePath: string): Promise<boolean> {
    const resolvedPath = await this.resolvePath(filePath);

    try {
      await fs.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory
   * @param dirPath Relative path to directory within the app's directory (default: root)
   * @returns Array of file/directory names
   */
  async listFiles(dirPath: string = ''): Promise<string[]> {
    const resolvedPath = await this.resolvePath(dirPath);

    try {
      return await fs.readdir(resolvedPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param filePath Relative path within the app's directory
   */
  async getMetadata(filePath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    isDirectory: boolean;
  }> {
    const resolvedPath = await this.resolvePath(filePath);

    try {
      const stats = await fs.stat(resolvedPath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Create a directory
   * @param dirPath Relative path within the app's directory
   */
  async createDirectory(dirPath: string): Promise<void> {
    const resolvedPath = await this.resolvePath(dirPath);
    await fs.mkdir(resolvedPath, { recursive: true });
  }

  /**
   * Delete a directory
   * @param dirPath Relative path within the app's directory
   * @param recursive If true, delete directory and all contents
   */
  async deleteDirectory(dirPath: string, recursive: boolean = false): Promise<void> {
    const resolvedPath = await this.resolvePath(dirPath);

    try {
      await fs.rm(resolvedPath, { recursive, force: recursive });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      throw error;
    }
  }
}

/**
 * Create a file manager instance for an app
 * @param appId ID of the app
 */
export function createFileManager(appId: string): FileManager {
  return new FileManager(appId);
}
