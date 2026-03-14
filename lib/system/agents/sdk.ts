import path from "path";
import fs from "fs/promises";
import LogManager from "@/lib/managers/log";
import TableManager from "@/lib/managers/table";
import FieldManager from "@/lib/managers/field";
import UserManager from "@/lib/managers/user";
import Logger from "@/lib/system/logger";
import AuthorityManager from "@/lib/managers/authority";
import { createRecord } from "@/lib/database/crud/create";
import { readRecord, readRecords } from "@/lib/database/crud/read";
import { updateRecord } from "@/lib/database/crud/update";
import { deleteRecord } from "@/lib/database/crud/delete";
import { getSystemSettings } from "@/lib/managers/setting";

interface SdkParams {
  appId: string;
  agentName: string;
  logger: Logger;
  params: Record<string, any>;
}

/**
 *
 * @param appId Agent app identifier
 * @param agentName Agent name
 * @param logger Agent logger
 * @param method Method to execute
 * @param params Params for the method
 * @returns Result of the execution
 */
export default async function executeMethod(
  appId: string,
  agentName: string,
  logger: Logger,
  method: string,
  params: Record<string, any>,
): Promise<any> {
  /**
   * Methods in this sdk reflect those in @/lib/sdk.ts
   */
  const sdk = {
    "logger.info": logger_info,
    "logger.warn": logger_warn,
    "logger.error": logger_error,
    "records.create": records_create,
    "records.list": records_list,
    "records.get": records_get,
    "records.delete": records_delete,
    "records.update": records_update,
    "files.read": files_read,
    "files.write": files_write,
    "files.delete": files_delete,
    "files.exists": files_exists,
    "files.mkdir": files_mkdir,
    "files.list": files_list,
    "files.stat": files_stat,
    "system.getUser": system_getUser,
    "system.getUsers": system_getUsers,
    "system.checkAuthorization": system_checkAuthorization,
    "sysfiles.list": sysfiles_list,
    "sysfiles.stat": sysfiles_stat,
    "sysfiles.exists": sysfiles_exists,
    "sysfiles.mkdir": sysfiles_mkdir,
    "sysfiles.delete": sysfiles_delete,
    "sysfiles.resize": sysfiles_resize,
  };

  if (!(method in sdk)) {
    throw new Error(`Unknown method "${method}" accessed for agent`);
  }

  return await sdk[method]({ appId, agentName, logger, params });
}

async function logger_info({
  appId,
  agentName,
  logger,
  params,
}: SdkParams): Promise<boolean> {
  new LogManager().info(appId, agentName + ": " + params.message);
  if (logger) logger.info(params.message);
  return true;
}

async function logger_warn({
  appId,
  agentName,
  logger,
  params,
}: SdkParams): Promise<boolean> {
  new LogManager().warn(appId, agentName + ": " + params.message);
  if (logger) logger.warning(params.message);
  return true;
}

async function logger_error({
  appId,
  agentName,
  logger,
  params,
}: SdkParams): Promise<boolean> {
  new LogManager().error(appId, agentName + ": " + params.message);
  if (logger) logger.error(params.message);
  return true;
}

async function records_create({ appId, params }: SdkParams): Promise<any> {
  return await createRecord(
    appId,
    params.table,
    await new TableManager().loadTable(appId, params.table),
    params.data,
  );
}

async function records_list({ appId, params }: SdkParams): Promise<any> {
  const targetAppId = params.appId || appId;
  return await readRecords(
    targetAppId,
    params.table,
    (
      await new FieldManager().readRecords({
        fields: { app: targetAppId, table_name: params.table },
      })
    ).records.map((r) => r.data),
    {
      limit: params.limit || 100,
      offset: params.offset || 0,
      filters: params.filters,
      condition: params.condition,
    },
  );
}

async function records_get({ appId, params }: SdkParams): Promise<any> {
  return await readRecord(appId, params.table, params.id);
}

async function records_delete({ appId, params }: SdkParams): Promise<any> {
  await deleteRecord(appId, params.table, params.id);
  return true;
}

async function records_update({ appId, params }: SdkParams): Promise<any> {
  return await updateRecord(
    appId,
    params.table,
    await new TableManager().loadTable(appId, params.table),
    params.id,
    params.data,
  );
}

/**
 * Get the app-scoped storage path for file operations
 */
async function getAppStoragePath(appId: string): Promise<string> {
  const storage = (await getSystemSettings())?.storage;

  if (!storage) {
    throw new Error("Storage is not configured");
  }

  return path.join(storage, "apps", appId, "data");
}

async function files_read({ appId, params }: SdkParams): Promise<any> {
  const appStoragePath = await getAppStoragePath(appId);
  const filePath = path.join(appStoragePath, params.path);

  return (await fs.readFile(filePath)).toString("base64");
}

async function files_write({ appId, params }: SdkParams): Promise<any> {
  const appStoragePath = await getAppStoragePath(appId);
  const filePath = path.join(appStoragePath, params.path);
  const fileFolder = path.dirname(filePath);

  await fs.mkdir(fileFolder, { recursive: true });
  const content =
    typeof params.content === "string" && params.encoding === "base64"
      ? Buffer.from(params.content, "base64")
      : params.content;
  await fs.writeFile(filePath, content);
  return true;
}

async function files_delete({ appId, params }: SdkParams): Promise<any> {
  const appStoragePath = await getAppStoragePath(appId);
  const filePath = path.join(appStoragePath, params.path);

  await fs.unlink(filePath);
  return true;
}

async function files_exists({ appId, params }: SdkParams): Promise<any> {
  const appStoragePath = await getAppStoragePath(appId);
  const filePath = path.join(appStoragePath, params.path);

  try {
    await fs.access(filePath);
    return true;
  } catch (e) {
    return false;
  }
}

async function files_mkdir({ appId, params }: SdkParams): Promise<any> {
  const appStoragePath = await getAppStoragePath(appId);
  const filePath = path.join(appStoragePath, params.path);

  await fs.mkdir(filePath, { recursive: true });
  return true;
}

async function files_list({ appId, params }: SdkParams): Promise<any> {
  const appStoragePath = await getAppStoragePath(appId);
  const filePath = path.join(appStoragePath, params.path);

  return await fs.readdir(filePath);
}

async function files_stat({ appId, params }: SdkParams): Promise<any> {
  const appStoragePath = await getAppStoragePath(appId);
  const filePath = path.join(appStoragePath, params.path);
  const stats = await fs.stat(filePath);

  return {
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    isDirectory: stats.isDirectory(),
  };
}

async function system_getUser({ params }: SdkParams): Promise<any> {
  const user = await new UserManager().readRecord(params.userId);
  if (!user) {
    return null;
  }

  const authority = await new AuthorityManager().readRecord(
    user.data.authority_id,
  );

  return {
    id: user.id,
    username: user.data.username,
    displayName: user.data.display_name,
    email: user.data.email,
    authorityName: authority?.data.name || "Unknown",
  };
}

async function system_getUsers({ params }: SdkParams): Promise<any> {
  const userManager = new UserManager();
  const authorityManager = new AuthorityManager();
  const allUsers = await userManager.listRecords();
  const includeInactive = params.includeInactive || false;

  const users = [];
  for (const userKey of allUsers) {
    const userId = userKey.split(":").pop();
    if (!userId) continue;

    const user = await userManager.readRecord(userId);
    if (!user) continue;
    if (!includeInactive && !user.data.is_active) continue;

    const authority = await authorityManager.readRecord(user.data.authority_id);

    users.push({
      id: user.id,
      username: user.data.username,
      displayName: user.data.display_name,
      email: user.data.email,
      isActive: user.data.is_active,
      authorityName: authority?.data.name || "Unknown",
    });
  }

  return users;
}

/**
 * Get the sysFileManager root path ({storagePath}/files)
 */
async function getSysFilesRoot(): Promise<string> {
  const storage = (await getSystemSettings())?.storage;
  if (!storage) throw new Error("Storage is not configured");
  return path.join(storage, "files");
}

async function sysfiles_list({ params }: SdkParams): Promise<any> {
  const root = await getSysFilesRoot();
  const filePath = path.join(root, params.path);
  const entries = await fs.readdir(filePath, { withFileTypes: true });
  return {
    entries: await Promise.all(
      entries.map(async (entry) => {
        let size = 0;
        try {
          if (!entry.isDirectory()) {
            const stat = await fs.stat(path.join(filePath, entry.name));
            size = stat.size;
          }
        } catch {}
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size,
        };
      }),
    ),
  };
}

async function sysfiles_stat({ params }: SdkParams): Promise<any> {
  const root = await getSysFilesRoot();
  const filePath = path.join(root, params.path);
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    isDirectory: stats.isDirectory(),
  };
}

async function sysfiles_exists({ params }: SdkParams): Promise<any> {
  const root = await getSysFilesRoot();
  const filePath = path.join(root, params.path);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sysfiles_mkdir({ params }: SdkParams): Promise<any> {
  const root = await getSysFilesRoot();
  const filePath = path.join(root, params.path);
  await fs.mkdir(filePath, { recursive: true });
  return true;
}

async function sysfiles_delete({ params }: SdkParams): Promise<any> {
  const root = await getSysFilesRoot();
  const filePath = path.join(root, params.path);
  await fs.rm(filePath, { recursive: params.recursive ?? false, force: true });
  return true;
}

async function sysfiles_resize({ params }: SdkParams): Promise<any> {
  const sharp = (await import("sharp")).default;
  const root = await getSysFilesRoot();
  const srcAbs = path.join(root, params.sourcePath);
  const destAbs = path.join(root, params.destPath);
  const width: number = params.width ?? 320;
  const height: number = params.height ?? 320;

  // Staleness check: skip if dest already exists and is at least as new as src
  try {
    const [srcStat, destStat] = await Promise.all([
      fs.stat(srcAbs),
      fs.stat(destAbs),
    ]);
    if (destStat.mtime >= srcStat.mtime) {
      return { generated: false };
    }
  } catch {
    // dest doesn't exist — proceed
  }

  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  await sharp(srcAbs)
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(destAbs);

  return { generated: true };
}

async function system_checkAuthorization({ params }: SdkParams): Promise<any> {
  if (!params.userId) return false;

  const userManager = new UserManager();
  const authorityManager = new AuthorityManager();

  const user = await userManager.readRecord(params.userId);
  if (!user) return false;

  const authorities = [
    await authorityManager.readRecord(user.data.authority_id),
    await authorityManager.readUserAuthority(params.userId),
  ];

  for (const authority of authorities) {
    if (
      authority &&
      authority.data.authorizations.includes(params.authorization)
    ) {
      return true;
    }
  }

  return false;
}
