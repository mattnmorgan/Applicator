import { getRedisClient } from "../redis";

/**
 * Get a system setting value
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(`settings:system:${key}`);
}

/**
 * Set a system setting value
 */
export async function setSystemSetting(
  key: string,
  value: string
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`settings:system:${key}`, value);
}

/**
 * Check if this is the first time setup
 */
export async function isFirstTimeSetup(): Promise<boolean> {
  const adminUserId = await getSystemSetting("administratorUserId");
  return adminUserId === null;
}
