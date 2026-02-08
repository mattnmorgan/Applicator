import {
  getRedisClient,
  getRecordKey,
  getKeyPrefix,
} from "@/lib/database/crud/redis";
import BulkResult from "@/lib/database/crud/types/bulk-result";
import type PendingOperation from "@/lib/database/crud/validation/types/pending-operation";

export interface DeleteOptions {
  cascade?: boolean;
}

export function deleteRecordWrapper<T = any>(appId: string, tableName: string) {
  return (recordId: string, options: DeleteOptions = {}) =>
    deleteRecord(appId, tableName, recordId, options);
}

export function bulkDeleteRecordsWrapper<T = any>(
  appId: string,
  tableName: string,
) {
  return (recordIds: string[], options: DeleteOptions = {}) =>
    bulkDeleteRecords(appId, tableName, recordIds, options);
}

export async function deleteRecord(
  appId: string,
  tableName: string,
  recordId: string,
  options: DeleteOptions = {},
): Promise<boolean> {
  const redis = getRedisClient();
  const key = getRecordKey(appId, tableName, recordId);

  // Read the record before deletion for cascade processing
  const rawData = await redis.get(key);
  if (!rawData) return false;

  const parsed = JSON.parse(rawData);
  const recordData = parsed.data as Record<string, any>;

  // Check for dependent records (referential integrity)
  const { checkDependents, cascadeCollectDeletes, cascadeCollect } =
    await import("@/lib/database/crud/validation/cascade");
  const dependents = await checkDependents(appId, tableName, recordId);

  if (dependents.length > 0 && !options.cascade) {
    const details = dependents
      .map(
        (d) =>
          `${d.appId}:${d.tableName}:${d.recordId} (field: ${d.fieldName})`,
      )
      .join(", ");
    throw new Error(
      `Cannot delete record: ${dependents.length} record(s) depend on it via required relationships: ${details}`,
    );
  }

  // Collect cascade delete operations (must happen before deletion so we can read dependents)
  const cascadeDeleteOps: PendingOperation[] = [];
  if (dependents.length > 0 && options.cascade) {
    await cascadeCollectDeletes(
      appId,
      tableName,
      recordId,
      recordData,
      cascadeDeleteOps,
    );
  }

  // Delete primary record (and cascade deletes) first so formulas see the correct state
  const delPipeline = redis.pipeline();
  delPipeline.del(key);
  for (const op of cascadeDeleteOps) {
    if (op.type === "del") {
      delPipeline.del(op.key);
    }
  }
  await delPipeline.exec();

  // Now collect formula reprocessing — formulas will no longer count deleted records
  const reprocessOps: PendingOperation[] = [];
  await cascadeCollect(appId, tableName, recordId, recordData, reprocessOps);

  // Also include any SET ops from cascade deletes (reprocessing from cascadeCollectDeletes)
  for (const op of cascadeDeleteOps) {
    if (op.type === "set") {
      reprocessOps.push(op);
    }
  }

  if (reprocessOps.length > 0) {
    const setPipeline = redis.pipeline();
    for (const op of reprocessOps) {
      setPipeline.set(op.key, op.value!);
    }
    await setPipeline.exec();
  }

  return true;
}

export async function bulkDeleteRecords(
  appId: string,
  tableName: string,
  recordIds: string[],
  options: DeleteOptions = {},
): Promise<BulkResult<any>> {
  const redis = getRedisClient();

  if (recordIds.length === 0) {
    return { success: [], failures: [] };
  }

  // Read all records before deletion
  const keys = recordIds.map((id) => getRecordKey(appId, tableName, id));
  const rawValues = await redis.mget(...keys);

  // Parse existing records
  const existingRecords: Array<{ id: string; data: Record<string, any> }> = [];
  for (let i = 0; i < recordIds.length; i++) {
    const rawValue = rawValues[i];
    if (rawValue) {
      const parsed = JSON.parse(rawValue);
      existingRecords.push({ id: recordIds[i], data: parsed.data });
    }
  }

  // Check dependents and collect cascade delete ops (before deletion so we can read data)
  const { checkDependents, cascadeCollectDeletes, cascadeCollect } =
    await import("@/lib/database/crud/validation/cascade");
  const cascadeDeleteOps: PendingOperation[] = [];

  for (const record of existingRecords) {
    const dependents = await checkDependents(appId, tableName, record.id);

    if (dependents.length > 0 && !options.cascade) {
      const details = dependents
        .map(
          (d) =>
            `${d.appId}:${d.tableName}:${d.recordId} (field: ${d.fieldName})`,
        )
        .join(", ");
      throw new Error(
        `Cannot delete record ${record.id}: ${dependents.length} record(s) depend on it via required relationships: ${details}`,
      );
    }

    if (dependents.length > 0 && options.cascade) {
      await cascadeCollectDeletes(
        appId,
        tableName,
        record.id,
        record.data,
        cascadeDeleteOps,
      );
    }
  }

  // Delete primary records and cascade deletes first so formulas see the correct state
  const delPipeline = redis.pipeline();
  for (const key of keys) {
    delPipeline.del(key);
  }
  for (const op of cascadeDeleteOps) {
    if (op.type === "del") {
      delPipeline.del(op.key);
    }
  }
  await delPipeline.exec();

  // Now collect formula reprocessing — formulas will no longer count deleted records
  const reprocessOps: PendingOperation[] = [];
  for (const record of existingRecords) {
    await cascadeCollect(
      appId,
      tableName,
      record.id,
      record.data,
      reprocessOps,
    );
  }
  for (const op of cascadeDeleteOps) {
    if (op.type === "set") {
      reprocessOps.push(op);
    }
  }

  if (reprocessOps.length > 0) {
    const setPipeline = redis.pipeline();
    for (const op of reprocessOps) {
      setPipeline.set(op.key, op.value!);
    }
    await setPipeline.exec();
  }

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
  const keys = await client.keys(getKeyPrefix(appId, tableName) + "*");
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
