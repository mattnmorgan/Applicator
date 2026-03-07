import type AppVersion from "@/lib/database/types/appVersion";

/**
 * Format a version object as a human-readable string
 */
export function formatVersion(version: AppVersion): string {
  return `v${version.major}.${version.minor}.${version.dev}`;
}

/**
 * Return the versioned subdirectory name for an app version.
 * e.g. { major: 1, minor: 2, dev: 3 } → "v1.2.3"
 */
export function versionDir(version: AppVersion): string {
  return `v${version.major}.${version.minor}.${version.dev}`;
}

/**
 * Check if version1 is greater than or equal to version2
 */
export function isVersionGreaterOrEqual(
  version1: AppVersion,
  version2: AppVersion
): boolean {
  if (version1.major > version2.major) return true;
  if (version1.major < version2.major) return false;
  if (version1.minor > version2.minor) return true;
  if (version1.minor < version2.minor) return false;
  return version1.dev >= version2.dev;
}
