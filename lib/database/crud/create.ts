import { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import Table from "@/lib/database/types/table";
import TableRecord from "@/lib/database/crud/types/record";
import { validateAndProcessRecord } from "@/lib/database/validation";
import BulkResult from "@/lib/database/crud/types/bulk-result";
import { withTransaction } from "@/lib/database/connections/postgresql";
import { quoteIfReserved } from "@/lib/database/schema/reserved";

export type Options = {
  id?: string;
  skipValidation?: boolean;
  client?: PoolClient;
};

function needsJsonStringify(value: any): boolean {
  return (
    value !== null && typeof value === "object" && !(value instanceof Date)
  );
}

/**
 * Low-level SQL insert for both system tables and the records table.
 */
export async function sqlCreate(
  client: PoolClient,
  appId: string,
  tableName: string,
  id: string,
  data: Record<string, any>,
  createdAt: number,
  updatedAt: number,
): Promise<void> {
  if (appId === "system") {
    const sqlColumns: string[] = ["id", "created_at", "updated_at"];
    const sqlValues: any[] = [id, createdAt, updatedAt];

    for (const [col, value] of Object.entries(data)) {
      if (value !== undefined) {
        sqlColumns.push(col);
        sqlValues.push(
          needsJsonStringify(value) ? JSON.stringify(value) : value,
        );
      }
    }

    const placeholders = sqlValues.map((_, i) => `$${i + 1}`).join(", ");
    const quotedColumns = sqlColumns.map(quoteIfReserved).join(", ");

    await client.query(
      `INSERT INTO ${tableName} (${quotedColumns}) VALUES (${placeholders})`,
      sqlValues,
    );
  } else {
    await client.query(
      `INSERT INTO records (id, app_id, table_name, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, appId, tableName, JSON.stringify(data), createdAt, updatedAt],
    );
  }
}

export function createRecordWrapper<T = any>(appId: string, tableName: string) {
  return (table: Table | null, data: T, options: Options = {}) =>
    createRecord<T>(appId, tableName, table, data, options);
}

export function bulkCreateRecordsWrapper<T = any>(
  appId: string,
  tableName: string,
) {
  return (table: Table | null, data: T[], options: Options = {}) =>
    bulkCreateRecords<T>(appId, tableName, table, data, options);
}

export async function createRecord<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  data: T,
  options: Options = {},
): Promise<TableRecord<T>> {
  const doWork = async (client: PoolClient) => {
    const id = options.id || uuidv4();
    const now = Date.now();

    // Validate and process the record (skip if table is null - bootstrap scenario)
    const processedData = await validateAndProcessRecord(
      appId,
      tableName,
      table,
      data as Record<string, any>,
      options.skipValidation || !table,
      id,
      client,
    );

    // Save primary record within transaction — cascade reads will see it
    await sqlCreate(client, appId, tableName, id, processedData, now, now);

    // Cascade: formulas run within the same transaction and see the new record
    if (table) {
      const { cascadeCollect } =
        await import("@/lib/database/validation/cascade");
      await cascadeCollect(
        appId,
        tableName,
        id,
        processedData as Record<string, any>,
        client,
      );
    }

    return {
      id,
      data: processedData as T,
      created_at: now,
      updated_at: now,
    };
  };

  if (options.client) {
    return doWork(options.client);
  }
  return withTransaction(doWork);
}

export async function bulkCreateRecords<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  dataArray: T[],
  options: Options = {},
): Promise<BulkResult<T>> {
  const doWork = async (client: PoolClient) => {
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
          options.skipValidation || !table,
          id,
          client,
        );

        records.push({
          id,
          data: processedData as T,
          created_at: now,
          updated_at: now,
        });
      } catch (error) {
        failures.push({
          data: dataArray[i],
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
    for (const record of records) {
      await sqlCreate(
        client,
        appId,
        tableName,
        record.id,
        record.data as Record<string, any>,
        now,
        now,
      );
    }

    // Cascade: formulas run within the same transaction and see all new records
    if (table) {
      const { cascadeCollect } =
        await import("@/lib/database/validation/cascade");
      for (const record of records) {
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
      success: records,
      failures: [],
    };
  };

  if (options.client) {
    return doWork(options.client);
  }
  return withTransaction(doWork);
}
