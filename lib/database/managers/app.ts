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

export function isVersionGreaterOrEqual(version1: AppVersion, version2: AppVersion): boolean {
  if (version1.major > version2.major) return true;
  if (version1.major < version2.major) return false;
  if (version1.minor > version2.minor) return true;
  if (version1.minor < version2.minor) return false;
  return version1.dev >= version2.dev;
}
