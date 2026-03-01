import { PoolClient } from "pg";
import BulkResult from "@/lib/database/crud/types/bulk-result";
import { readRecord, sqlReadAll } from "@/lib/database/crud/read";
import { withTransaction } from "@/lib/database/connections/postgresql";
import RecordFilter from "@/lib/database/crud/types/record-filter";

export interface DeleteOptions {
  cascade?: boolean;
  client?: PoolClient;
}

/**
 * Low-level SQL delete for a single record.
 */
export async function sqlDelete(
  client: PoolClient,
  appId: string,
  tableName: string,
  id: string,
): Promise<boolean> {
  if (appId === "system") {
    const result = await client.query(
      `DELETE FROM ${tableName} WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  } else {
    const result = await client.query(
      `DELETE FROM records WHERE app_id = $1 AND table_name = $2 AND id = $3`,
      [appId, tableName, id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

/**
 * Low-level SQL delete all records for a given app/table.
 */
export async function sqlDeleteAll(
  client: PoolClient,
  appId: string,
  tableName: string,
): Promise<void> {
  if (appId === "system") {
    await client.query(`DELETE FROM ${tableName}`);
  } else {
    await client.query(
      `DELETE FROM records WHERE app_id = $1 AND table_name = $2`,
      [appId, tableName],
    );
  }
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
  const doWork = async (client: PoolClient) => {
    // Read the record before deletion for cascade processing
    const existing = await readRecord(appId, tableName, recordId, client);
    if (!existing) return false;

    const recordData = existing.data as Record<string, any>;

    // Check for dependent records (referential integrity)
    const { checkDependents, cascadeCollectDeletes, cascadeCollect } =
      await import("@/lib/database/validation/cascade");
    const dependents = await checkDependents(
      appId,
      tableName,
      recordId,
      client,
    );

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

    // Cascade delete dependent records (within the transaction)
    if (dependents.length > 0 && options.cascade) {
      await cascadeCollectDeletes(
        appId,
        tableName,
        recordId,
        recordData,
        client,
      );
    }

    // Delete primary record
    await sqlDelete(client, appId, tableName, recordId);

    // Cascade formula reprocessing — formulas will no longer count deleted records
    await cascadeCollect(appId, tableName, recordId, recordData, client);

    return true;
  };

  if (options.client) {
    return doWork(options.client);
  }
  return withTransaction(doWork);
}

export async function bulkDeleteRecords(
  appId: string,
  tableName: string,
  recordIds: string[],
  options: DeleteOptions = {},
): Promise<BulkResult<any>> {
  if (recordIds.length === 0) {
    return { success: [], failures: [] };
  }

  const doWork = async (client: PoolClient) => {
    // Read all records before deletion
    const existingRecords: Array<{ id: string; data: Record<string, any> }> =
      [];
    for (const id of recordIds) {
      const existing = await readRecord(appId, tableName, id, client);
      if (existing) {
        existingRecords.push({
          id,
          data: existing.data as Record<string, any>,
        });
      }
    }

    // Check dependents and cascade delete (within the transaction)
    const { checkDependents, cascadeCollectDeletes, cascadeCollect } =
      await import("@/lib/database/validation/cascade");

    for (const record of existingRecords) {
      const dependents = await checkDependents(
        appId,
        tableName,
        record.id,
        client,
      );

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
          client,
        );
      }
    }

    // Delete all primary records
    for (const record of existingRecords) {
      await sqlDelete(client, appId, tableName, record.id);
    }

    // Cascade formula reprocessing for all deleted records
    for (const record of existingRecords) {
      await cascadeCollect(appId, tableName, record.id, record.data, client);
    }

    return {
      success: recordIds.map((id) => ({
        id,
        data: {},
        created_at: 0,
        updated_at: 0,
      })),
      failures: [],
    };
  };

  if (options.client) {
    return doWork(options.client);
  }
  return withTransaction(doWork);
}

export async function deleteAll(
  appId: string,
  tableName: string,
  client?: PoolClient,
) {
  if (client) {
    return sqlDeleteAll(client, appId, tableName);
  }
  return withTransaction(async (txClient) => {
    await sqlDeleteAll(txClient, appId, tableName);
  });
}

export function deleteFilteredRecordsWrapper<T = any>(
  appId: string,
  tableName: string,
) {
  return (
    filter: Omit<RecordFilter<T>, "includeRelated">,
    options: DeleteOptions = {},
  ) => deleteFilteredRecords<T>(appId, tableName, filter, options);
}

/**
 * Delete all records matching the given filter.
 * Uses the same filter mechanics as readRecords (including JSONB field support).
 * Returns the number of records deleted.
 */
export async function deleteFilteredRecords<T = any>(
  appId: string,
  tableName: string,
  filter: Omit<RecordFilter<T>, "includeRelated">,
  options: DeleteOptions = {},
): Promise<number> {
  const doWork = async (client: PoolClient): Promise<number> => {
    const result = await sqlReadAll<T>(client, appId, tableName, {
      ids: filter.ids,
      fields: filter.fields as Record<string, any> | undefined,
      filters: filter.filters,
      condition: filter.condition,
    });

    const ids = result.records.map((r) => r.id);
    if (ids.length === 0) return 0;

    await bulkDeleteRecords(appId, tableName, ids, { ...options, client });
    return ids.length;
  };

  if (options.client) {
    return doWork(options.client);
  }
  return withTransaction(doWork);
}
