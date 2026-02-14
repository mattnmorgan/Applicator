import { PoolClient } from "pg";
import CRUD from "@/lib/database/crud";
import Field from "@/lib/database/types/field";

export default class FieldManager extends CRUD<Field> {
  tableName = "fields";
  appId = "system";

  /**
   * Get field ID in the format "appId:tableName:fieldName"
   */
  getFieldId(appId: string, tableName: string, fieldName: string): string {
    return `${appId}:${tableName}:${fieldName}`;
  }

  /**
   * Load all fields for a specific table
   * @param appId The app ID
   * @param tableName The table name
   * @param client Optional transaction client
   * @returns Array of Field objects
   */
  async loadTableFields(
    appId: string,
    tableName: string,
    client?: PoolClient,
  ): Promise<Field[]> {
    const result = await super.readRecords(
      { fields: { app: appId, table_name: tableName } },
      client,
    );
    return result.records.map((r) => r.data);
  }

  /**
   * Create a field for a table
   * @param appId The app ID
   * @param tableName The table name
   * @param field The field definition (app and table will be set automatically)
   * @param client Optional transaction client
   */
  async createField(
    appId: string,
    tableName: string,
    field: Omit<Field, "app" | "table_name">,
    client?: PoolClient,
  ): Promise<void> {
    const fieldRecord: Field = {
      app: appId,
      table_name: tableName,
      ...field,
    };

    await this.createRecord(await this.getTable(), fieldRecord, {
      id: this.getFieldId(appId, tableName, field.name),
      client,
    });
  }

  /**
   * Delete all fields for a table
   * @param appId The app ID
   * @param tableName The table name
   * @param client Optional transaction client
   */
  async deleteTableFields(
    appId: string,
    tableName: string,
    client?: PoolClient,
  ): Promise<void> {
    const fields = await this.loadTableFields(appId, tableName, client);
    const fieldIds = fields.map((f) =>
      this.getFieldId(appId, tableName, f.name)
    );
    if (fieldIds.length > 0) {
      await this.bulkDeleteRecords(fieldIds, { client });
    }
  }

  /**
   * Delete a specific field
   * @param appId The app ID
   * @param tableName The table name
   * @param fieldName The field name
   * @param client Optional transaction client
   */
  async deleteField(
    appId: string,
    tableName: string,
    fieldName: string,
    client?: PoolClient,
  ): Promise<void> {
    await this.deleteRecord(this.getFieldId(appId, tableName, fieldName), {
      client,
    });
  }
}
