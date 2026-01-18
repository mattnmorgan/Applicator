import CRUD from "@/lib/database/crud";
import Table from "@/lib/database/types/table";

export default class TableManager extends CRUD<Table> {
  tableName = "table";
  appId = "system";

  /**
   * Load a table definition by appId and tableName
   * @param appId The app ID
   * @param tableName The table name
   * @returns The table definition or null if not found
   */
  async loadTable(appId: string, tableName: string): Promise<Table | null> {
    const tableRecord = await this.readRecord(`${appId}:${tableName}`);
    return tableRecord?.data || null;
  }

  /**
   * Create a new table
   * @param appId The app ID
   * @param tableName The table name
   * @param tableData The table definition
   * @returns The created table record
   */
  async createTable(appId: string, tableName: string, tableData: Table) {
    return await this.createRecord(await this.getTable(), tableData, {
      id: `${appId}:${tableName}`,
    });
  }

  /**
   * Delete a table record
   * @param appId The app ID
   * @param tableName The table name
   */
  async deleteTable(appId: string, tableName: string) {
    await this.deleteRecord(`${appId}:${tableName}`);
  }
}
