/**
 * Record operations helper
 * Provides compatibility layer for old record management functions
 */

import { loadTable } from "@/lib/db/tables";
import { createRecordWrapper } from "@/lib/database/crud/create";
import { deleteRecordWrapper } from "@/lib/database/crud/delete";
import { readRecordsWrapper } from "@/lib/database/crud/read";

export async function createRecord(
  tableName: string,
  appId: string,
  data: any,
  options?: { id?: string }
) {
  const create = createRecordWrapper(appId, tableName);
  const table = await loadTable(appId, tableName);

  if (!table) {
    throw new Error(`Table ${tableName} not found for app ${appId}`);
  }

  return await create(table, data, options);
}

export async function deleteRecord(
  tableName: string,
  appId: string,
  recordId: string
) {
  const deleteRec = deleteRecordWrapper(appId, tableName);
  return await deleteRec(recordId);
}

export async function readRecords(tableName: string, appId: string) {
  const readRecs = readRecordsWrapper(appId, tableName);
  return await readRecs();
}
