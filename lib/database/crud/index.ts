import { PoolClient } from "pg";
import {
  updateRecordWrapper,
  bulkUpdateRecordsWrapper,
} from "@/lib/database/crud/update";
import {
  readRecord,
  readRecords,
  readRecordWrapper,
} from "@/lib/database/crud/read";
import {
  deleteRecordWrapper,
  bulkDeleteRecordsWrapper,
  deleteFilteredRecordsWrapper,
  deleteAll,
} from "@/lib/database/crud/delete";
import {
  createRecordWrapper,
  bulkCreateRecordsWrapper,
} from "@/lib/database/crud/create";
import { upsertRecordWrapper } from "@/lib/database/crud/upsert";
import { closePool } from "@/lib/database/connections/postgresql";
import { listRecords } from "@/lib/database/crud/list";
import Table from "@/lib/database/types/table";
import Field from "@/lib/database/types/field";
import RecordFilter from "@/lib/database/crud/types/record-filter";
import Result from "@/lib/database/crud/types/read-result";

export default abstract class CRUD<T = any, J = Record<string, any>> {
  protected tableName!: string;
  protected appId!: string;
  table!: Table | null;
  fields!: Field[] | null;

  async readRecords(
    filter: RecordFilter<T> = {},
    client?: PoolClient,
  ): Promise<Result<T, J>> {
    const fields = await this.getTableFields();
    return await readRecords<T, J>(
      this.appId,
      this.tableName,
      fields || [],
      filter,
      client,
    );
  }

  get createRecord() {
    return createRecordWrapper<T>(this.appId, this.tableName);
  }
  get bulkCreateRecords() {
    return bulkCreateRecordsWrapper<T>(this.appId, this.tableName);
  }
  get deleteRecord() {
    return deleteRecordWrapper<T>(this.appId, this.tableName);
  }
  get bulkDeleteRecords() {
    return bulkDeleteRecordsWrapper<T>(this.appId, this.tableName);
  }
  get deleteFilteredRecords() {
    return deleteFilteredRecordsWrapper<T>(this.appId, this.tableName);
  }
  get readRecord() {
    return readRecordWrapper<T, J>(this.appId, this.tableName);
  }
  get updateRecord() {
    return updateRecordWrapper<T>(this.appId, this.tableName);
  }
  get bulkUpdateRecords() {
    return bulkUpdateRecordsWrapper<T>(this.appId, this.tableName);
  }
  get upsertRecord() {
    return upsertRecordWrapper<T>(this.appId, this.tableName);
  }

  async getTable(): Promise<Table | null> {
    if (!this.table) {
      const tableRecord = await readRecord<Table>(
        "system",
        "app_tables",
        `${this.appId}:${this.tableName}`,
      );
      this.table = tableRecord?.data || null;
    }
    return this.table;
  }

  async getTableFields(): Promise<Field[] | null> {
    if (!this.fields) {
      // We pass an empty array for readRecords here because it only gets used for
      // checking relationships, which we don't care about here
      this.fields =
        (await readRecords<Field>("system", "fields", [], {}))?.records?.map(
          (r) => r.data,
        ) || null;
    }
    return this.fields;
  }

  async listRecords(client?: PoolClient) {
    return await listRecords(this.tableName, this.appId, client);
  }

  async deleteAll(client?: PoolClient) {
    await deleteAll(this.appId, this.tableName, client);
  }

  closePool = closePool;
}

/**
 * Generic CRUD wrapper
 */
export class GenericCRUD<T = any, J = Record<string, any>> extends CRUD<T, J> {
  public constructor(appId: string, tableId: string) {
    super();
    this.appId = appId;
    this.tableName = tableId;
  }
}
