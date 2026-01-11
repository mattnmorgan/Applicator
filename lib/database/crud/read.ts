import {
  getRedisClient,
  getRecordKey,
  getKeyPrefix,
} from "@/lib/database/crud/redis";
import ReadResult from "@/lib/database/crud/types/read-result";
import RecordFilter from "@/lib/database/crud/types/record-filter";
import TableRecord from "@/lib/database/crud/types/record";

export function readRecordWrapper<T = any>(appId: string, tableName: string) {
  return (id: string) => readRecord<T>(appId, tableName, id);
}

export function readRecordsWrapper<T = any>(appId: string, tableName: string) {
  return (filter: RecordFilter = {}) =>
    readRecords<T>(appId, tableName, filter);
}

export async function readRecord<T = any>(
  appId: string,
  tableName: string,
  recordId: string
): Promise<TableRecord<T> | null> {
  const data = await getRedisClient().get(
    getRecordKey(appId, tableName, recordId)
  );
  return data != null ? (JSON.parse(data) as TableRecord<T>) : null;
}

export async function readRecords<T = any>(
  appId: string,
  tableName: string,
  filter: RecordFilter = {}
): Promise<ReadResult<T>> {
  const redis = getRedisClient();
  const { ids, fields, limit, offset = 0 } = filter;

  let records: TableRecord<T>[] = [];

  if (ids && ids.length > 0) {
    // Read specific records by IDs
    const keys = ids.map((id) => getRecordKey(appId, tableName, id));
    const values = await redis.mget(...keys);

    for (const value of values) {
      if (value) {
        records.push(JSON.parse(value) as TableRecord<T>);
      }
    }
  } else {
    // Read all records for the table
    const prefix = getKeyPrefix(appId, tableName);
    const keys = await redis.keys(`${prefix}*`);
    keys.sort();

    if (keys.length > 0) {
      const values = await redis.mget(...keys);
      for (const value of values) {
        if (value) {
          records.push(JSON.parse(value) as TableRecord<T>);
        }
      }
    }
  }

  // Apply field-based filters
  if (fields && Object.keys(fields).length > 0) {
    records = records.filter((record) => {
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        const recordValue = (record.data as any)[fieldName];
        if (recordValue !== fieldValue) {
          return false;
        }
      }
      return true;
    });
  }

  const total = records.length;

  // Apply pagination
  const paginatedRecords = limit
    ? records.slice(offset, offset + limit)
    : records;

  return {
    records: paginatedRecords,
    total,
    limit: limit != undefined ? limit : total,
    offset,
  };
}
