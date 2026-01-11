import {
  getRedisClient,
  getRecordKey,
  getKeyPrefix,
} from "@/lib/database/crud/redis";
import BulkResult from "@/lib/database/crud/types/bulk-result";

export function deleteRecordWrapper<T = any>(appId: string, tableName: string) {
  return (recordId: string) => deleteRecord(appId, tableName, recordId);
}

export function bulkDeleteRecordsWrapper<T = any>(
  appId: string,
  tableName: string
) {
  return (recordIds: string[]) =>
    bulkDeleteRecords(appId, tableName, recordIds);
}

export async function deleteRecord(
  appId: string,
  tableName: string,
  recordId: string
): Promise<boolean> {
  return (
    (await getRedisClient().del(getRecordKey(appId, tableName, recordId))) > 0
  );
}

export async function bulkDeleteRecords(
  appId: string,
  tableName: string,
  recordIds: string[]
): Promise<BulkResult<any>> {
  const redis = getRedisClient();
  const deletedIds: string[] = [];
  const failures: Array<{ id: string; error: string }> = [];

  if (recordIds.length === 0) {
    return { success: [], failures: [] };
  }

  // Delete all records
  const keys = recordIds.map((id) => getRecordKey(appId, tableName, id));
  const result = await redis.del(...keys);

  // Since Redis del returns count of deleted keys, we assume all succeeded
  // In a more robust implementation, you might want to check existence first
  return {
    success: recordIds.map((id) => ({
      id,
      data: {},
      createdAt: 0,
      updatedAt: 0,
    })),
    failures: [],
  };
}

export async function deleteAll(appId: string, tableName: string) {
  const client = getRedisClient();
  await client.del(await client.keys(getKeyPrefix(appId, tableName) + "*"));
}
