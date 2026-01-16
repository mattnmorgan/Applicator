/**
 * Plugin SDK
 * Provides plugin context and utilities for app API handlers
 */

import { getSession } from "@/lib/database/managers/session";
import SettingManager from "@/lib/database/managers/setting";
import AuthorityManager from "@/lib/database/managers/authority";
import UserManager from "@/lib/database/managers/user";
import path from "path";
import fs from "fs/promises";

export interface PluginContext {
  appId: string;
  userId?: string;
  files: {
    writeFile: (filePath: string, content: Buffer | string) => Promise<void>;
    readFile: (filePath: string) => Promise<Buffer>;
    deleteFile: (filePath: string) => Promise<void>;
    exists: (filePath: string) => Promise<boolean>;
    mkdir: (dirPath: string) => Promise<void>;
    createDirectory: (dirPath: string) => Promise<void>;
    readdir: (dirPath: string) => Promise<string[]>;
    stat: (filePath: string) => Promise<any>;
    listFiles: (dirPath: string) => Promise<string[]>;
    getMetadata: (filePath: string) => Promise<{
      size: number;
      modifiedAt: Date;
      isDirectory: boolean;
    }>;
  };
  getUser: () => Promise<any>;
  hasAuthorization: (authorization: string) => Promise<boolean>;
}

export async function createPlugin(appId: string, userId?: string): Promise<PluginContext> {
  const settingManager = new SettingManager();
  const storageRecord = await settingManager.readRecord("storage");
  const storagePath = storageRecord?.data.value;

  if (!storagePath) {
    throw new Error("System storage not configured");
  }

  const appStoragePath = path.join(storagePath, "apps", appId, "data");

  // Ensure app storage directory exists
  try {
    await fs.mkdir(appStoragePath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const plugin: PluginContext = {
    appId,
    userId,
    files: {
      writeFile: async (filePath: string, content: Buffer | string) => {
        const fullPath = path.join(appStoragePath, filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content);
      },
      readFile: async (filePath: string) => {
        const fullPath = path.join(appStoragePath, filePath);
        return await fs.readFile(fullPath);
      },
      deleteFile: async (filePath: string) => {
        const fullPath = path.join(appStoragePath, filePath);
        await fs.unlink(fullPath);
      },
      exists: async (filePath: string) => {
        const fullPath = path.join(appStoragePath, filePath);
        try {
          await fs.access(fullPath);
          return true;
        } catch {
          return false;
        }
      },
      mkdir: async (dirPath: string) => {
        const fullPath = path.join(appStoragePath, dirPath);
        await fs.mkdir(fullPath, { recursive: true });
      },
      createDirectory: async (dirPath: string) => {
        const fullPath = path.join(appStoragePath, dirPath);
        await fs.mkdir(fullPath, { recursive: true });
      },
      readdir: async (dirPath: string) => {
        const fullPath = path.join(appStoragePath, dirPath);
        return await fs.readdir(fullPath);
      },
      stat: async (filePath: string) => {
        const fullPath = path.join(appStoragePath, filePath);
        return await fs.stat(fullPath);
      },
      listFiles: async (dirPath: string) => {
        const fullPath = path.join(appStoragePath, dirPath);
        return await fs.readdir(fullPath);
      },
      getMetadata: async (filePath: string) => {
        const fullPath = path.join(appStoragePath, filePath);
        const stats = await fs.stat(fullPath);
        return {
          size: stats.size,
          modifiedAt: stats.mtime,
          isDirectory: stats.isDirectory(),
        };
      },
    },
    getUser: async () => {
      if (!userId) return null;
      const userManager = new UserManager();
      const user = await userManager.readRecord(userId);
      return user?.data || null;
    },
    hasAuthorization: async (authorization: string) => {
      if (!userId) return false;

      const userManager = new UserManager();
      const authorityManager = new AuthorityManager();

      const user = await userManager.readRecord(userId);
      if (!user) return false;

      const authorities = [
        await authorityManager.readRecord(user.data.authority),
        await authorityManager.readUserAuthority(userId),
      ];

      for (const authority of authorities) {
        if (authority && authority.data.authorizations.includes(authorization)) {
          return true;
        }
      }

      return false;
    },
  };

  return plugin;
}

export { getSession };

/**
 * Require authorization middleware for plugin API handlers
 * Usage: const authorized = await requireAuthorization(context, "admin");
 */
export async function requireAuthorization(
  context: { plugin: PluginContext },
  authorization: string
): Promise<boolean> {
  if (!context.plugin.userId) {
    return false;
  }

  return await context.plugin.hasAuthorization(authorization);
}
