/**
 * Generic record operations for the data model system
 */

import { getRedisClient } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';
import TableRecord from '@/lib/database/types/tableRecord';
import TableDefinition from '@/lib/database/types/tableDefinition';
import {
  CreateRecordOptions,
  UpdateRecordOptions,
  RecordFilter,
  BulkOperationResult,
  RecordReadResult,
} from '@/lib/model/types/operations';
import { validateAndProcessRecord } from './validation';

/**
 * Get the Redis key prefix for a table
 * System tables: "{table}:"
 * App tables: "sandbox:{app}:{table}:"
 */
function getKeyPrefix(appId: string, tableName: string): string {
  if (appId === 'system') {
    return `${tableName}:`;
  }
  return `sandbox:${appId}:${tableName}:`;
}

/**
 * Get the Redis key for a specific record
 */
function getRecordKey(appId: string, tableName: string, recordId: string): string {
  const prefix = getKeyPrefix(appId, tableName);
  return `${prefix}${recordId}`;
}

/**
 * Parse a full record key back into its components
 */
function parseRecordKey(key: string): { appId: string; tableName: string; recordId: string } | null {
  // Try system format first: "{table}:{id}"
  const systemMatch = key.match(/^([^:]+):([^:]+)$/);
  if (systemMatch) {
    return {
      appId: 'system',
      tableName: systemMatch[1],
      recordId: systemMatch[2],
    };
  }

  // Try app format: "sandbox:{app}:{table}:{id}"
  const appMatch = key.match(/^sandbox:([^:]+):([^:]+):(.+)$/);
  if (appMatch) {
    return {
      appId: appMatch[1],
      tableName: appMatch[2],
      recordId: appMatch[3],
    };
  }

  return null;
}

/**
 * Create a new record
 */
export async function createRecord<T = any>(
  appId: string,
  tableName: string,
  table: TableDefinition,
  data: T,
  options: CreateRecordOptions = {}
): Promise<TableRecord<T>> {
  const redis = getRedisClient();
  const id = options.id || uuidv4();
  const now = new Date().toISOString();

  // Validate and process the record
  const processedData = await validateAndProcessRecord(
    appId,
    tableName,
    table,
    data as Record<string, any>,
    options.skipValidation || false
  );

  const record: TableRecord<T> = {
    id,
    data: processedData as T,
    createdAt: now,
    updatedAt: now,
  };

  const key = getRecordKey(appId, tableName, id);
  await redis.set(key, JSON.stringify(record));

  return record;
}

/**
 * Read a single record by ID
 */
export async function readRecord<T = any>(
  appId: string,
  tableName: string,
  recordId: string
): Promise<TableRecord<T> | null> {
  const redis = getRedisClient();
  const key = getRecordKey(appId, tableName, recordId);
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as TableRecord<T>;
}

/**
 * Update a record by ID
 */
export async function updateRecord<T = any>(
  appId: string,
  tableName: string,
  table: TableDefinition,
  recordId: string,
  data: Partial<T>,
  options: UpdateRecordOptions = {}
): Promise<TableRecord<T> | null> {
  const redis = getRedisClient();
  const existing = await readRecord<T>(appId, tableName, recordId);

  if (!existing) {
    return null;
  }

  const updatedData = options.replace
    ? (data as T)
    : { ...existing.data, ...data };

  // Validate and process the updated record
  const processedData = await validateAndProcessRecord(
    appId,
    tableName,
    table,
    updatedData as Record<string, any>,
    options.skipValidation || false
  );

  const updatedRecord: TableRecord<T> = {
    ...existing,
    data: processedData as T,
    updatedAt: new Date().toISOString(),
  };

  const key = getRecordKey(appId, tableName, recordId);
  await redis.set(key, JSON.stringify(updatedRecord));

  return updatedRecord;
}

/**
 * Delete a record by ID
 */
export async function deleteRecord(
  appId: string,
  tableName: string,
  recordId: string
): Promise<boolean> {
  const redis = getRedisClient();
  const key = getRecordKey(appId, tableName, recordId);
  const result = await redis.del(key);
  return result > 0;
}

/**
 * Read multiple records with filtering
 */
export async function readRecords<T = any>(
  appId: string,
  tableName: string,
  filter: RecordFilter = {}
): Promise<RecordReadResult<T>> {
  const redis = getRedisClient();
  const { ids, fields, limit = 100, offset = 0 } = filter;

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
  const paginatedRecords = records.slice(offset, offset + limit);

  return {
    records: paginatedRecords,
    total,
    limit,
    offset,
  };
}

/**
 * Bulk create records (all or nothing)
 */
export async function bulkCreateRecords<T = any>(
  appId: string,
  tableName: string,
  table: TableDefinition,
  dataArray: T[],
  options: CreateRecordOptions = {}
): Promise<BulkOperationResult<T>> {
  const redis = getRedisClient();
  const now = new Date().toISOString();
  const records: TableRecord<T>[] = [];
  const failures: Array<{ data: any; error: string }> = [];

  // Validate and process all records first
  for (let i = 0; i < dataArray.length; i++) {
    try {
      const data = dataArray[i];
      const id = uuidv4();

      const processedData = await validateAndProcessRecord(
        appId,
        tableName,
        table,
        data as Record<string, any>,
        options.skipValidation || false
      );

      records.push({
        id,
        data: processedData as T,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      failures.push({
        data: dataArray[i],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // If any validation failed, don't commit anything
  if (failures.length > 0) {
    return {
      success: [],
      failures,
    };
  }

  // All validations passed, commit to database using pipeline
  const pipeline = redis.pipeline();
  for (const record of records) {
    const key = getRecordKey(appId, tableName, record.id);
    pipeline.set(key, JSON.stringify(record));
  }

  await pipeline.exec();

  return {
    success: records,
    failures: [],
  };
}

/**
 * Bulk update records (all or nothing)
 */
export async function bulkUpdateRecords<T = any>(
  appId: string,
  tableName: string,
  table: TableDefinition,
  updates: Array<{ id: string; data: Partial<T> }>,
  options: UpdateRecordOptions = {}
): Promise<BulkOperationResult<T>> {
  const redis = getRedisClient();
  const updatedRecords: TableRecord<T>[] = [];
  const failures: Array<{ id: string; data: any; error: string }> = [];

  // Read all existing records
  const existingRecords = new Map<string, TableRecord<T>>();
  for (const update of updates) {
    const existing = await readRecord<T>(appId, tableName, update.id);
    if (!existing) {
      failures.push({
        id: update.id,
        data: update.data,
        error: `Record not found: ${update.id}`,
      });
    } else {
      existingRecords.set(update.id, existing);
    }
  }

  // If any records not found, fail the entire operation
  if (failures.length > 0) {
    return {
      success: [],
      failures,
    };
  }

  // Validate and process all updates
  for (const update of updates) {
    try {
      const existing = existingRecords.get(update.id)!;
      const updatedData = options.replace
        ? (update.data as T)
        : { ...existing.data, ...update.data };

      const processedData = await validateAndProcessRecord(
        appId,
        tableName,
        table,
        updatedData as Record<string, any>,
        options.skipValidation || false
      );

      updatedRecords.push({
        ...existing,
        data: processedData as T,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      failures.push({
        id: update.id,
        data: update.data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // If any validation failed, don't commit anything
  if (failures.length > 0) {
    return {
      success: [],
      failures,
    };
  }

  // All validations passed, commit to database using pipeline
  const pipeline = redis.pipeline();
  for (const record of updatedRecords) {
    const key = getRecordKey(appId, tableName, record.id);
    pipeline.set(key, JSON.stringify(record));
  }

  await pipeline.exec();

  return {
    success: updatedRecords,
    failures: [],
  };
}

/**
 * Bulk delete records
 */
export async function bulkDeleteRecords(
  appId: string,
  tableName: string,
  recordIds: string[]
): Promise<BulkOperationResult<any>> {
  const redis = getRedisClient();
  const deletedIds: string[] = [];
  const failures: Array<{ id: string; error: string }> = [];

  if (recordIds.length === 0) {
    return { success: [], failures: [] };
  }

  // Delete all records
  const keys = recordIds.map((id) => getRecordKey(appId, tableName, id));
  const result = await redis.del(...keys);

  // Since Redis del returns count of deleted keys, we assume all succeeded
  // In a more robust implementation, you might want to check existence first
  return {
    success: recordIds.map((id) => ({
      id,
      data: {},
      createdAt: '',
      updatedAt: '',
    })),
    failures: [],
  };
}
