import { getRedisClient, getKeyPrefix } from "@/lib/database/crud/redis";

export async function listRecords(
  table: string,
  appId: string
): Promise<string[]> {
  return await getRedisClient().keys(getKeyPrefix(appId, table) + "*");
}
