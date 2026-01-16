import Table from "@/lib/database/types/table";
import TableRecord from "@/lib/database/crud/types/record";
import { createRecord, Options as CreateOptions } from "@/lib/database/crud/create";
import { updateRecord, Options as UpdateOptions } from "@/lib/database/crud/update";
import { readRecord } from "@/lib/database/crud/read";

export type Options = CreateOptions & UpdateOptions;

export function upsertRecordWrapper<T = any>(appId: string, tableName: string) {
  return (table: Table | null, id: string, data: T, options: Options = {}) =>
    upsertRecord<T>(appId, tableName, table, id, data, options);
}

/**
 * Create or update a record based on whether it exists
 * @param appId - Application ID
 * @param tableName - Table name
 * @param table - Table definition
 * @param id - Record ID
 * @param data - Record data (full data for create, can be partial for update)
 * @param options - Options for create/update
 * @returns Created or updated record
 */
export async function upsertRecord<T = any>(
  appId: string,
  tableName: string,
  table: Table | null,
  id: string,
  data: T,
  options: Options = {}
): Promise<TableRecord<T>> {
  // Check if record exists
  const existing = await readRecord<T>(appId, tableName, id);

  if (existing) {
    // Update existing record
    const updated = await updateRecord<T>(
      appId,
      tableName,
      table,
      id,
      data as Partial<T>,
      options
    );
    return updated!; // We know it exists since we just checked
  } else {
    // Create new record
    return await createRecord<T>(
      appId,
      tableName,
      table,
      data,
      { ...options, id }
    );
  }
}
