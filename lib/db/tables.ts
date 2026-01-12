/**
 * Table operations helper
 * Provides compatibility layer for table loading
 */

import TableManager from "@/lib/database/managers/table";
import Table from "@/lib/database/types/table";

export async function loadTable(appId: string, tableName: string): Promise<Table | null> {
  const tableManager = new TableManager();
  const tableRecord = await tableManager.readRecord(`${appId}:${tableName}`);
  return tableRecord?.data || null;
}

export async function createTable(appId: string, tableName: string, tableData: Table) {
  const tableManager = new TableManager();
  return await tableManager.createRecord(
    await tableManager.getTable(),
    tableData,
    { id: `${appId}:${tableName}` }
  );
}

export async function deleteTable(appId: string, tableName: string) {
  const tableManager = new TableManager();
  await tableManager.deleteRecord(`${appId}:${tableName}`);
}
