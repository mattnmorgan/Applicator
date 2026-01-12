import {
  updateRecordWrapper,
  bulkUpdateRecordsWrapper,
} from "@/lib/database/crud/update";
import {
  readRecord,
  readRecordWrapper,
  readRecordsWrapper,
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
import {
  getRedisClient,
  getKeyPrefix,
  closeRedis,
  getRecordKey,
} from "@/lib/database/crud/redis";
import { listRecords } from "@/lib/database/crud/list";
import Table from "@/lib/database/types/table";

export default abstract class CRUD<T = any> {
  tableName: string;
  appId: string;
  table: Table | null;

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
  get readRecords() {
    return readRecordsWrapper<T>(this.appId, this.tableName);
  }
  get updateRecord() {
    return updateRecordWrapper<T>(this.appId, this.tableName);
  }
  get bulkUpdateRecords() {
    return bulkUpdateRecordsWrapper<T>(this.appId, this.tableName);
  }

  async getTable(): Promise<Table | null> {
    if (!this.table) {
      const tableRecord = await readRecord<Table>("system", "table", this.tableName);
      this.table = tableRecord?.data || null;
    }
    return this.table;
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
