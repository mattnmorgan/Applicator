import CRUD from "@/lib/database/crud";
import App from "@/lib/database/types/app";
import AppVersion from "@/lib/database/types/appVersion";

export default class AppManager extends CRUD<App> {
  tableName = "app";
  appId = "system";
}

export function formatVersion(version: AppVersion): string {
  return `v${version.major}.${version.minor}.${version.dev}`;
}
