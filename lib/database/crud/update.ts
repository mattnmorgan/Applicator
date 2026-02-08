import Table from "@/lib/database/types/table";
import TableRecord from "@/lib/database/crud/types/record";
import BulkResult from "@/lib/database/crud/types/bulk-result";
import { getRedisClient, getRecordKey } from "@/lib/database/crud/redis";
import { readRecord } from "@/lib/database/crud/read";
import { validateAndProcessRecord } from "@/lib/database/crud/validation";
import type PendingOperation from "@/lib/database/crud/validation/types/pending-operation";

export interface Options {
  skipValidation?: boolean;
  replace?: boolean;
}

export function updateRecordWrapper<T = any>(appId: string, tableName: string) {
  return (
    table: Table | null,
    id: string,
    data: Partial<T>,
    options: Options = {},
  ) => updateRecord(appId, tableName, table, id, data, options);
}

export function bulkUpdateRecordsWrapper<T = any>(
  appId: string,
  tableName: string,
) {
  return (
    table: Table | null,
    updates: { id: string; data: Partial<T> }[],
    options: Options = {},
  ) => bulkUpdateRecords(appId, tableName, table, updates, options);
}

export async function updateRecord<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  recordId: string,
  data: Partial<T>,
  options: Options = {},
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
    options.skipValidation || !table,
    recordId,
  );

  const updatedRecord: TableRecord<T> = {
    ...existing,
    data: processedData as T,
    updatedAt: Date.now(),
  };

  // Save primary record first so cascade formulas see the updated data
  const key = getRecordKey(appId, tableName, recordId);
  await redis.set(key, JSON.stringify(updatedRecord));

  // Collect and commit cascade operations
  if (table) {
    const { cascadeCollect } =
      await import("@/lib/database/crud/validation/cascade");
    const cascadeOps = await cascadeCollect(
      appId,
      tableName,
      recordId,
      processedData as Record<string, any>,
    );

    if (cascadeOps.length > 0) {
      const pipeline = redis.pipeline();
      for (const op of cascadeOps) {
        if (op.type === "del") {
          pipeline.del(op.key);
        } else {
          pipeline.set(op.key, op.value!);
        }
      }
      await pipeline.exec();
    }
  }

  return updatedRecord;
}

export async function bulkUpdateRecords<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  updates: Array<{ id: string; data: Partial<T> }>,
  options: Options = {},
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
        options.skipValidation || !table,
        update.id,
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

  // Save all primary records first so cascade formulas see the updated data
  const primaryPipeline = redis.pipeline();
  for (const record of updatedRecords) {
    const key = getRecordKey(appId, tableName, record.id);
    primaryPipeline.set(key, JSON.stringify(record));
  }
  await primaryPipeline.exec();

  // Collect and commit cascade operations
  if (table) {
    const cascadeOps: PendingOperation[] = [];
    const { cascadeCollect } =
      await import("@/lib/database/crud/validation/cascade");
    for (const record of updatedRecords) {
      const ops = await cascadeCollect(
        appId,
        tableName,
        record.id,
        record.data as Record<string, any>,
      );
      cascadeOps.push(...ops);
    }

    if (cascadeOps.length > 0) {
      const cascadePipeline = redis.pipeline();
      for (const op of cascadeOps) {
        if (op.type === "del") {
          cascadePipeline.del(op.key);
        } else {
          cascadePipeline.set(op.key, op.value!);
        }
      }
      await cascadePipeline.exec();
    }
  }

  return {
    success: updatedRecords,
    failures: [],
  };
}
