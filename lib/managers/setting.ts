import CRUD from "@/lib/database/crud";
import Setting from "@/lib/database/types/setting";
import { SYSTEM_APP_METADATA } from "@/lib/database/systemMetadata";

export default class SettingManager extends CRUD<Setting> {
  appId = "system";
  tableName = "settings";
}

export type SystemSettings = {
  brandName?: string;
  brandIcon?: string;
  siteUrl?: string;
  loggingEnabled?: string;
  selfregistrationEnabled?: string;
  appInplaceEnabled?: string;
  storage?: string;
  ntfyServerUrl?: string;
  ntfyUsername?: string;
  ntfyPasswordSet?: string;
  version?: { major: number; minor: number; dev: number };
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const manager = new SettingManager();
  const result: SystemSettings = {
    version: SYSTEM_APP_METADATA.version,
  };

  for (const setting of [
    "brandName",
    "brandIcon",
    "siteUrl",
    "loggingEnabled",
    "selfregistrationEnabled",
    "appInplaceEnabled",
    "storage",
    "ntfyServerUrl",
    "ntfyUsername",
  ] as const) {
    const record = await manager.readRecord(setting);
    if (record) {
      result[setting] = record.data.value;
    }
  }

  // Indicate whether password is set without exposing the value
  const passwordRecord = await manager.readRecord("ntfyPassword");
  result.ntfyPasswordSet = passwordRecord?.data.value ? "true" : "false";

  if (result.brandIcon) {
    result.brandIcon = `/api/system/assets/brand?t=${Date.now()}`;
  }

  if (!result.brandName) {
    result.brandName = "Applicator";
  }

  return result;
}
