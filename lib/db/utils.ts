import { AppVersion } from "@/lib/database/types/app";

/**
 * Format an AppVersion object to a string (e.g., "1.2.3")
 */
export function formatVersion(version: AppVersion): string {
  return `${version.major}.${version.minor}.${version.dev}`;
}

/**
 * Parse a version string to an AppVersion object
 */
export function parseVersion(versionString: string): AppVersion {
  const parts = versionString.split(".").map((p) => parseInt(p, 10));
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    dev: parts[2] || 0,
  };
}

/**
 * Compare two versions
 * @returns Negative if v1 < v2, 0 if equal, positive if v1 > v2
 */
export function compareVersions(v1: AppVersion, v2: AppVersion): number {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.dev - v2.dev;
}

/**
 * Check if installed version meets the required version
 */
export function isVersionGreaterOrEqual(
  installed: AppVersion,
  required: AppVersion
): boolean {
  return compareVersions(installed, required) >= 0;
}
