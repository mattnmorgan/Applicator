import { v4 as uuidv4 } from "uuid";
import Table from "@/lib/database/types/table";
import TableRecord from "@/lib/database/crud/types/record";
import { getRedisClient } from "@/lib/database/crud/redis";
import { validateAndProcessRecord } from "@/lib/database/crud/validation";
import { getRecordKey } from "@/lib/database/crud/redis";
import BulkResult from "@/lib/database/crud/types/bulk-result";

export type Options = {
  id?: string;
  skipValidation?: boolean;
};

export function createRecordWrapper<T = any>(appId: string, tableName: string) {
  return (table: Table | null, data: T, options: Options = {}) =>
    createRecord<T>(appId, tableName, table, data, options);
}

export function bulkCreateRecordsWrapper<T = any>(
  appId: string,
  tableName: string
) {
  return (table: Table | null, data: T[], options: Options = {}) =>
    bulkCreateRecords<T>(appId, tableName, table, data, options);
}

export async function createRecord<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  data: T,
  options: Options = {}
): Promise<TableRecord<T>> {
  const redis = getRedisClient();
  const id = options.id || uuidv4();
  const now = Date.now();

  // Validate and process the record (skip if table is null - bootstrap scenario)
  const processedData = await validateAndProcessRecord(
    appId,
    tableName,
    table,
    data as Record<string, any>,
    options.skipValidation || !table
  );

  const record: TableRecord<T> = {
    id,
    data: processedData as T,
    createdAt: now,
    updatedAt: now,
  };

  const key = getRecordKey(appId, tableName, id);
  await redis.set(key, JSON.stringify(record));

  return record;
}

export async function bulkCreateRecords<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  dataArray: T[],
  options: Options = {}
): Promise<BulkResult<T>> {
  const redis = getRedisClient();
  const now = Date.now();
  const records: TableRecord<T>[] = [];
  const failures: Array<{ data: any; error: string }> = [];

  // Validate and process all records first
  for (let i = 0; i < dataArray.length; i++) {
    try {
      const data = dataArray[i];
      const id = uuidv4();

      const processedData = await validateAndProcessRecord(
        appId,
        tableName,
        table,
        data as Record<string, any>,
        options.skipValidation || !table
      );

      records.push({
        id,
        data: processedData as T,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      failures.push({
        data: dataArray[i],
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
  for (const record of records) {
    const key = getRecordKey(appId, tableName, record.id);
    pipeline.set(key, JSON.stringify(record));
  }

  await pipeline.exec();

  return {
    success: records,
    failures: [],
  };
}
