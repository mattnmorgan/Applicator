import { PoolClient } from "pg";
import CRUD from "@/lib/database/crud";
import Table from "@/lib/database/types/table";

export default class TableManager extends CRUD<Table> {
  tableName = "app_tables";
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
   * @param client Optional transaction client
   * @returns The created table record
   */
  async createTable(
    appId: string,
    tableName: string,
    tableData: Table,
    client?: PoolClient,
  ) {
    return await this.createRecord(await this.getTable(), tableData, {
      id: `${appId}:${tableName}`,
      client,
    });
  }

  /**
   * Delete a table record
   * @param appId The app ID
   * @param tableName The table name
   * @param client Optional transaction client
   */
  async deleteTable(appId: string, tableName: string, client?: PoolClient) {
    await this.deleteRecord(`${appId}:${tableName}`, { client });
  }
}
