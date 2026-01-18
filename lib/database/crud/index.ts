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
  deleteAll,
} from "@/lib/database/crud/delete";
import {
  createRecordWrapper,
  bulkCreateRecordsWrapper,
} from "@/lib/database/crud/create";
import { upsertRecordWrapper } from "@/lib/database/crud/upsert";
import {
  getRedisClient,
  getKeyPrefix,
  closeRedis,
  getRecordKey,
} from "@/lib/database/crud/redis";
import { listRecords } from "@/lib/database/crud/list";
import Table from "@/lib/database/types/table";
import Field from "@/lib/database/types/field";
import RecordFilter from "@/lib/database/crud/types/record-filter";
import Result from "@/lib/database/crud/types/read-result";

export default abstract class CRUD<T = any> {
  tableName!: string;
  appId!: string;
  table!: Table | null;
  fields!: Field[] | null;

  async readRecords(filter: RecordFilter<T> = {}): Promise<Result<T>> {
    return await readRecords<T>(
      this.appId,
      this.tableName,
      await this.getTableFields(),
      filter
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
  get readRecord() {
    return readRecordWrapper<T>(this.appId, this.tableName);
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
        "table",
        this.tableName
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
        (await readRecords<Field>("system", "field", [], {}))?.records?.map(
          (r) => r.data
        ) || null;
    }
    return this.fields;
  }

  async listRecords() {
    return await listRecords(this.tableName, this.appId);
  }

  async deleteAll() {
    await deleteAll(this.appId, this.tableName);
  }

  getRedisClient = getRedisClient;
  getKeyPrefix = getKeyPrefix;
  closeRedis = closeRedis;
  getRecordKey = getRecordKey;
}
