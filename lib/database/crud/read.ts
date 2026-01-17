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
  filter: RecordFilter = {},
  table: any = null
): Promise<ReadResult<T>> {
  const redis = getRedisClient();
  const { ids, fields, limit, offset = 0, includeRelated } = filter;

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

  // Fetch related records if requested
  let related: Record<string, Record<string, TableRecord[]>> | undefined;
  if (includeRelated && includeRelated.length > 0 && table) {
    related = {};

    for (const record of paginatedRecords) {
      const recordRelated: Record<string, TableRecord[]> = {};

      for (const relationshipFieldName of includeRelated) {
        // Find the relationship field definition in the table
        const relationshipField = table.fields?.find(
          (f: any) => f.name === relationshipFieldName && f.type === "relationship"
        );

        if (relationshipField && relationshipField.relatedTo) {
          // Parse the relatedTo to get the target table
          // Format can be "tableName" or "appId:tableName"
          const relatedTo = relationshipField.relatedTo;
          let targetAppId = appId;
          let targetTableName = relatedTo;

          if (relatedTo.includes(":")) {
            [targetAppId, targetTableName] = relatedTo.split(":");
          }

          // Get the relationship field value from the record
          const relationshipValue = (record.data as any)[relationshipFieldName];

          if (relationshipValue) {
            // Relationship value can be a single ID or an array of IDs
            const relatedIds = Array.isArray(relationshipValue)
              ? relationshipValue
              : [relationshipValue];

            // Fetch all related records
            const relatedRecords: TableRecord[] = [];
            for (const relatedId of relatedIds) {
              const relatedRecord = await readRecord(
                targetAppId,
                targetTableName,
                relatedId
              );
              if (relatedRecord) {
                relatedRecords.push(relatedRecord);
              }
            }

            recordRelated[relationshipFieldName] = relatedRecords;
          } else {
            recordRelated[relationshipFieldName] = [];
          }
        }
      }

      related[record.id] = recordRelated;
    }
  }

  return {
    records: paginatedRecords,
    total,
    limit: limit != undefined ? limit : total,
    offset,
    ...(related && { related }),
  };
}
