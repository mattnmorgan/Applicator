import Table from "@/lib/database/types/table";
import TableRecord from "@/lib/database/crud/types/record";
import BulkResult from "@/lib/database/crud/types/bulk-result";
import { getRedisClient, getRecordKey } from "@/lib/database/crud/redis";
import { readRecord } from "@/lib/database/crud/read";
import { validateAndProcessRecord } from "@/lib/database/crud/validation";

export interface Options {
  skipValidation?: boolean;
  replace?: boolean;
}

export function updateRecordWrapper<T = any>(appId: string, tableName: string) {
  return (table: Table | null, id: string, data: Partial<T>, options: Options = {}) =>
    updateRecord(appId, tableName, table, id, data, options);
}

export function bulkUpdateRecordsWrapper<T = any>(
  appId: string,
  tableName: string
) {
  return (
    table: Table | null,
    updates: { id: string; data: Partial<T> }[],
    options: Options = {}
  ) => bulkUpdateRecords(appId, tableName, table, updates, options);
}

export async function updateRecord<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  recordId: string,
  data: Partial<T>,
  options: Options = {}
): Promise<TableRecord<T> | null> {
  const redis = getRedisClient();
  const existing = await readRecord<T>(appId, tableName, recordId);

  if (!existing) {
    return null;
  }

  const updatedData = options.replace
    ? (data as T)
    : { ...existing.data, ...data };

  // Validate and process the updated record
  const processedData = await validateAndProcessRecord(
    appId,
    tableName,
    table,
    updatedData as Record<string, any>,
    options.skipValidation || !table
  );

  const updatedRecord: TableRecord<T> = {
    ...existing,
    data: processedData as T,
    updatedAt: Date.now(),
  };

  const key = getRecordKey(appId, tableName, recordId);
  await redis.set(key, JSON.stringify(updatedRecord));

  return updatedRecord;
}

export async function bulkUpdateRecords<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  updates: Array<{ id: string; data: Partial<T> }>,
  options: Options = {}
): Promise<BulkResult<T>> {
  const redis = getRedisClient();
  const updatedRecords: TableRecord<T>[] = [];
  const failures: Array<{ id: string; data: any; error: string }> = [];

  // Read all existing records
  const existingRecords = new Map<string, TableRecord<T>>();
  for (const update of updates) {
    const existing = await readRecord<T>(appId, tableName, update.id);
    if (!existing) {
      failures.push({
        id: update.id,
        data: update.data,
        error: `Record not found: ${update.id}`,
      });
    } else {
      existingRecords.set(update.id, existing);
    }
  }

  // If any records not found, fail the entire operation
  if (failures.length > 0) {
    return {
      success: [],
      failures,
    };
  }

  // Validate and process all updates
  for (const update of updates) {
    try {
      const existing = existingRecords.get(update.id)!;
      const updatedData = options.replace
        ? (update.data as T)
        : { ...existing.data, ...update.data };

      const processedData = await validateAndProcessRecord(
        appId,
        tableName,
        table,
        updatedData as Record<string, any>,
        options.skipValidation || !table
      );

      updatedRecords.push({
        ...existing,
        data: processedData as T,
        updatedAt: Date.now(),
      });
    } catch (error) {
      failures.push({
        id: update.id,
        data: update.data,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // If any validation failed, don't commit anything
  if (failures.length > 0) {
    return {
      success: [],
      failures,
    };
  }

  // All validations passed, commit to database using pipeline
  const pipeline = redis.pipeline();
  for (const record of updatedRecords) {
    const key = getRecordKey(appId, tableName, record.id);
    pipeline.set(key, JSON.stringify(record));
  }

  await pipeline.exec();

  return {
    success: updatedRecords,
    failures: [],
  };
}
