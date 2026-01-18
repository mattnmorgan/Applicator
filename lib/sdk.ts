/**
 * Plugin SDK
 * Provides plugin context and utilities for app API handlers
 */

import { getSession } from "@/lib/database/managers/session";
import SettingManager from "@/lib/database/managers/setting";
import AuthorityManager from "@/lib/database/managers/authority";
import UserManager from "@/lib/database/managers/user";
import LogManager from "@/lib/database/managers/log";
import TableManager from "@/lib/database/managers/table";
import FieldManager from "@/lib/database/managers/field";
import { createRecord, bulkCreateRecords } from "@/lib/database/crud/create";
import { readRecord, readRecords } from "@/lib/database/crud/read";
import { updateRecord } from "@/lib/database/crud/update";
import { deleteRecord } from "@/lib/database/crud/delete";
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
  records: {
    create: (data: any) => Promise<any>;
    list: (options?: { limit?: number; offset?: number }) => Promise<any>;
    get: (id: string) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  system: {
    checkMyAuthorization: (authorization: string) => Promise<boolean>;
    getUser: (userId: string) => Promise<any>;
    getUsers: (includeInactive?: boolean) => Promise<any[]>;
  };
  logger: {
    info: (message: string) => Promise<void>;
    warn: (message: string) => Promise<void>;
    error: (message: string) => Promise<void>;
  };
  getUser: () => Promise<any>;
  hasAuthorization: (authorization: string) => Promise<boolean>;
}

export async function createPlugin(
  appId: string,
  userId?: string
): Promise<PluginContext> {
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

  // Determine the main table for this app
  // For now, apps use a table with the same name as the appId (e.g., "task" app uses "task" table)
  const tableManager = new TableManager();
  const tableName = appId; // Convention: table name matches app ID
  const table = await tableManager.loadTable(appId, tableName);

  // Load the table fields
  const fieldManager = new FieldManager();
  const fieldsResult = await fieldManager.readRecords({
    fields: { app: appId, table: tableName }
  });
  const tableFields = fieldsResult.records.map(r => r.data);

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
    records: {
      create: async (data: any) => {
        const record = await createRecord(appId, tableName, table, data);
        return record;
      },
      list: async (options?: { limit?: number; offset?: number }) => {
        const result = await readRecords(appId, tableName, tableFields, {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
        });
        return result;
      },
      get: async (id: string) => {
        const record = await readRecord(appId, tableName, id);
        return record;
      },
      update: async (id: string, data: any) => {
        const record = await updateRecord(appId, tableName, table, id, data);
        return record;
      },
      delete: async (id: string) => {
        await deleteRecord(appId, tableName, id);
      },
    },
    system: {
      checkMyAuthorization: async (authorization: string) => {
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
          if (
            authority &&
            authority.data.authorizations.includes(authorization)
          ) {
            return true;
          }
        }

        return false;
      },
      getUser: async (userId: string) => {
        const userManager = new UserManager();
        const user = await userManager.readRecord(userId);
        if (!user) return null;

        const authorityManager = new AuthorityManager();
        const authority = await authorityManager.readRecord(
          user.data.authority
        );

        return {
          id: user.id,
          username: user.data.username,
          displayName: user.data.displayName,
          email: user.data.email,
          authorityName: authority?.data.name || "Unknown",
        };
      },
      getUsers: async (includeInactive: boolean = false) => {
        const userManager = new UserManager();
        const authorityManager = new AuthorityManager();
        const allUsers = await userManager.listRecords();

        const users = [];
        for (const userKey of allUsers) {
          const userId = userKey.split(":").pop();
          if (!userId) continue;

          const user = await userManager.readRecord(userId);
          if (!user) continue;

          if (!includeInactive && !user.data.isActive) continue;

          const authority = await authorityManager.readRecord(
            user.data.authority
          );

          users.push({
            id: user.id,
            username: user.data.username,
            displayName: user.data.displayName,
            email: user.data.email,
            isActive: user.data.isActive,
            authorityName: authority?.data.name || "Unknown",
          });
        }

        return users;
      },
    },
    logger: {
      info: async (message: string) => {
        const logManager = new LogManager();
        await logManager.info(appId, message);
      },
      warn: async (message: string) => {
        const logManager = new LogManager();
        await logManager.warn(appId, message);
      },
      error: async (message: string) => {
        const logManager = new LogManager();
        await logManager.error(appId, message);
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
        if (
          authority &&
          authority.data.authorizations.includes(authorization)
        ) {
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
 * Usage:
 *   await requireAuthorization(context, "system:admin");
 *   await requireAuthorization(plugin, "task:manage");
 */
export async function requireAuthorization(
  contextOrPlugin: { plugin: PluginContext } | PluginContext,
  authorization: string
): Promise<boolean> {
  const plugin =
    "plugin" in contextOrPlugin ? contextOrPlugin.plugin : contextOrPlugin;

  if (!plugin.userId) {
    throw new Error("User must be authenticated to check authorization");
  }

  const hasAuth = await plugin.hasAuthorization(authorization);
  if (!hasAuth) {
    throw new Error(`Missing required authorization: ${authorization}`);
  }

  return true;
}
