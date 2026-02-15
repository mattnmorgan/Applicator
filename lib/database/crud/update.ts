import { PoolClient } from "pg";
import Table from "@/lib/database/types/table";
import TableRecord from "@/lib/database/crud/types/record";
import BulkResult from "@/lib/database/crud/types/bulk-result";
import { readRecord } from "@/lib/database/crud/read";
import { validateAndProcessRecord } from "@/lib/database/validation";
import { withTransaction } from "@/lib/database/connections/postgresql";
import { quoteIfReserved, getJsonbColumns, serializeValue } from "@/lib/database/utility/postgresql";

export interface Options {
  skipValidation?: boolean;
  replace?: boolean;
  client?: PoolClient;
}

/**
 * Low-level SQL update for both system tables and the records table.
 */
export async function sqlUpdate(
  client: PoolClient,
  appId: string,
  tableName: string,
  id: string,
  data: Record<string, any>,
  updatedAt: number,
): Promise<boolean> {
  if (appId === "system") {
    const jsonbCols = getJsonbColumns(tableName);
    const setClauses: string[] = [`updated_at = $2`];
    const params: any[] = [id, updatedAt];
    let paramIdx = 3;

    for (const [col, value] of Object.entries(data)) {
      if (value !== undefined && col !== "id" && col !== "created_at" && col !== "updated_at") {
        setClauses.push(`${quoteIfReserved(col)} = $${paramIdx}`);
        params.push(serializeValue(value, jsonbCols.has(col)));
        paramIdx++;
      }
    }

    const result = await client.query(
      `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE id = $1`,
      params,
    );
    return (result.rowCount ?? 0) > 0;
  } else {
    const result = await client.query(
      `UPDATE records SET data = $1, updated_at = $2 WHERE app_id = $3 AND table_name = $4 AND id = $5`,
      [JSON.stringify(data), updatedAt, appId, tableName, id],
    );
    return (result.rowCount ?? 0) > 0;
  }
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
  const doWork = async (client: PoolClient) => {
    const existing = await readRecord<T>(appId, tableName, recordId, client);

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
      client,
    );

    const now = Date.now();
    const updatedRecord: TableRecord<T> = {
      ...existing,
      data: processedData as T,
      updated_at: now,
    };

    // Save primary record within transaction — cascade reads will see it
    await sqlUpdate(client, appId, tableName, recordId, processedData, now);

    // Cascade: formulas run within the same transaction
    if (table) {
      const { cascadeCollect } =
        await import("@/lib/database/validation/cascade");
      await cascadeCollect(
        appId,
        tableName,
        recordId,
        processedData as Record<string, any>,
        client,
      );
    }

    return updatedRecord;
  };

  if (options.client) {
    return doWork(options.client);
  }
  return withTransaction(doWork);
}

export async function bulkUpdateRecords<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  updates: Array<{ id: string; data: Partial<T> }>,
  options: Options = {},
): Promise<BulkResult<T>> {
  const doWork = async (client: PoolClient) => {
    const updatedRecords: TableRecord<T>[] = [];
    const failures: Array<{ id: string; data: any; error: string }> = [];

    // Read all existing records within the transaction
    const existingRecords = new Map<string, TableRecord<T>>();
    for (const update of updates) {
      const existing = await readRecord<T>(appId, tableName, update.id, client);
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
    const now = Date.now();
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
          client,
        );

        updatedRecords.push({
          ...existing,
          data: processedData as T,
          updated_at: now,
        });
      } catch (error) {
        failures.push({
          id: update.id,
          data: update.data,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // If any validation failed, don't commit anything (transaction will rollback)
    if (failures.length > 0) {
      return {
        success: [],
        failures,
      };
    }

    // Save all primary records within the transaction
    for (const record of updatedRecords) {
      await sqlUpdate(
        client,
        appId,
        tableName,
        record.id,
        record.data as Record<string, any>,
        now,
      );
    }

    // Cascade: formulas run within the same transaction
    if (table) {
      const { cascadeCollect } =
        await import("@/lib/database/validation/cascade");
      for (const record of updatedRecords) {
        await cascadeCollect(
          appId,
          tableName,
          record.id,
          record.data as Record<string, any>,
          client,
        );
      }
    }

    return {
      success: updatedRecords,
      failures: [],
    };
  };

  if (options.client) {
    return doWork(options.client);
  }
  return withTransaction(doWork);
}
