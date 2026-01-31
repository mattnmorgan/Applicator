import CRUD from "@/lib/database/crud";
import Setting from "@/lib/database/types/setting";
import { SYSTEM_APP_METADATA } from "@/lib/database/systemMetadata";

export default class SettingManager extends CRUD<Setting> {
  appId = "system";
  tableName = "setting";
}

export type SystemSettings = {
  brandName?: string;
  brandIcon?: string;
  loggingEnabled?: string;
  selfregistrationEnabled?: string;
  appInplaceEnabled?: string;
  storage?: string;
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
    "loggingEnabled",
    "selfregistrationEnabled",
    "appInplaceEnabled",
    "storage",
  ] as const) {
    const record = await manager.readRecord(setting);
    if (record) {
      result[setting] = record.data.value;
    }
  }

  if (result.brandIcon) {
    result.brandIcon = `/api/system/assets/brand?t=${Date.now()}`;
  }

  if (!result.brandName) {
    result.brandName = "Applicator";
  }

  return result;
}
