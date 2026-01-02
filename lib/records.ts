import { getRedisClient } from './redis';
import { v4 as uuidv4 } from 'uuid';

export interface RecordManagerOptions {
  appId: string;
}

export interface Record<T = any> {
  id: string;
  data: T;
  createdAt: string;
  updatedAt: string;
}

export interface ListRecordsOptions {
  limit?: number;
  offset?: number;
  pattern?: string;
}

export interface ListRecordsResult<T = any> {
  records: Record<T>[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * RecordManager provides sandboxed CRUD operations for app-specific records.
 * Each app's records are isolated using Redis key prefixing: `sandbox:{appId}:records:{recordId}`
 */
export class RecordManager<T = any> {
  private appId: string;
  private keyPrefix: string;

  constructor(options: RecordManagerOptions) {
    this.appId = options.appId;
    this.keyPrefix = `sandbox:${this.appId}:records:`;
  }

  /**
   * Get the Redis key for a specific record
   */
  private getRecordKey(recordId: string): string {
    return `${this.keyPrefix}${recordId}`;
  }

  /**
   * Create a new record
   * @param data The data to store in the record
   * @param customId Optional custom ID for the record (defaults to UUID)
   * @returns The created record with metadata
   */
  async create(data: T, customId?: string): Promise<Record<T>> {
    const redis = getRedisClient();
    const id = customId || uuidv4();
    const now = new Date().toISOString();

    const record: Record<T> = {
      id,
      data,
      createdAt: now,
      updatedAt: now,
    };

    const key = this.getRecordKey(id);
    await redis.set(key, JSON.stringify(record));

    return record;
  }

  /**
   * Read a record by ID
   * @param recordId The ID of the record to retrieve
   * @returns The record if found, null otherwise
   */
  async read(recordId: string): Promise<Record<T> | null> {
    const redis = getRedisClient();
    const key = this.getRecordKey(recordId);
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as Record<T>;
  }

  /**
   * Update a record by ID
   * @param recordId The ID of the record to update
   * @param data The new data (will be merged with existing data)
   * @param replace If true, replaces the entire data object instead of merging
   * @returns The updated record if found, null otherwise
   */
  async update(
    recordId: string,
    data: Partial<T>,
    replace: boolean = false
  ): Promise<Record<T> | null> {
    const redis = getRedisClient();
    const existing = await this.read(recordId);

    if (!existing) {
      return null;
    }

    const updatedData = replace ? (data as T) : { ...existing.data, ...data };
    const updatedRecord: Record<T> = {
      ...existing,
      data: updatedData,
      updatedAt: new Date().toISOString(),
    };

    const key = this.getRecordKey(recordId);
    await redis.set(key, JSON.stringify(updatedRecord));

    return updatedRecord;
  }

  /**
   * Delete a record by ID
   * @param recordId The ID of the record to delete
   * @returns True if the record was deleted, false if it didn't exist
   */
  async delete(recordId: string): Promise<boolean> {
    const redis = getRedisClient();
    const key = this.getRecordKey(recordId);
    const result = await redis.del(key);
    return result > 0;
  }

  /**
   * List all records for this app
   * @param options Pagination and filtering options
   * @returns Paginated list of records
   */
  async list(options: ListRecordsOptions = {}): Promise<ListRecordsResult<T>> {
    const redis = getRedisClient();
    const { limit = 100, offset = 0, pattern } = options;

    // Get all keys matching this app's records
    const searchPattern = pattern
      ? `${this.keyPrefix}${pattern}`
      : `${this.keyPrefix}*`;

    const keys = await redis.keys(searchPattern);
    const total = keys.length;

    // Sort keys for consistent pagination
    keys.sort();

    // Apply pagination
    const paginatedKeys = keys.slice(offset, offset + limit);

    // Fetch all records
    const records: Record<T>[] = [];
    if (paginatedKeys.length > 0) {
      const values = await redis.mget(...paginatedKeys);
      for (const value of values) {
        if (value) {
          records.push(JSON.parse(value) as Record<T>);
        }
      }
    }

    return {
      records,
      total,
      limit,
      offset,
    };
  }

  /**
   * Check if a record exists
   * @param recordId The ID of the record to check
   * @returns True if the record exists, false otherwise
   */
  async exists(recordId: string): Promise<boolean> {
    const redis = getRedisClient();
    const key = this.getRecordKey(recordId);
    const result = await redis.exists(key);
    return result > 0;
  }

  /**
   * Count all records for this app
   * @param pattern Optional pattern to filter records
   * @returns The number of records
   */
  async count(pattern?: string): Promise<number> {
    const redis = getRedisClient();
    const searchPattern = pattern
      ? `${this.keyPrefix}${pattern}`
      : `${this.keyPrefix}*`;
    const keys = await redis.keys(searchPattern);
    return keys.length;
  }

  /**
   * Delete all records for this app (use with caution!)
   * @returns The number of records deleted
   */
  async deleteAll(): Promise<number> {
    const redis = getRedisClient();
    const keys = await redis.keys(`${this.keyPrefix}*`);

    if (keys.length === 0) {
      return 0;
    }

    const result = await redis.del(...keys);
    return result;
  }

  /**
   * Batch create multiple records
   * @param dataArray Array of data objects to create
   * @returns Array of created records
   */
  async batchCreate(dataArray: T[]): Promise<Record<T>[]> {
    const redis = getRedisClient();
    const now = new Date().toISOString();
    const records: Record<T>[] = [];
    const pipeline = redis.pipeline();

    for (const data of dataArray) {
      const id = uuidv4();
      const record: Record<T> = {
        id,
        data,
        createdAt: now,
        updatedAt: now,
      };
      records.push(record);
      pipeline.set(this.getRecordKey(id), JSON.stringify(record));
    }

    await pipeline.exec();
    return records;
  }

  /**
   * Batch read multiple records by IDs
   * @param recordIds Array of record IDs to retrieve
   * @returns Array of records (null for records that don't exist)
   */
  async batchRead(recordIds: string[]): Promise<(Record<T> | null)[]> {
    if (recordIds.length === 0) {
      return [];
    }

    const redis = getRedisClient();
    const keys = recordIds.map((id) => this.getRecordKey(id));
    const values = await redis.mget(...keys);

    return values.map((value) => {
      if (!value) {
        return null;
      }
      return JSON.parse(value) as Record<T>;
    });
  }

  /**
   * Batch delete multiple records by IDs
   * @param recordIds Array of record IDs to delete
   * @returns The number of records deleted
   */
  async batchDelete(recordIds: string[]): Promise<number> {
    if (recordIds.length === 0) {
      return 0;
    }

    const redis = getRedisClient();
    const keys = recordIds.map((id) => this.getRecordKey(id));
    const result = await redis.del(...keys);
    return result;
  }
}

/**
 * Factory function to create a RecordManager instance for an app
 * @param appId The ID of the app
 * @returns A RecordManager instance
 */
export function createRecordManager<T = any>(appId: string): RecordManager<T> {
  return new RecordManager<T>({ appId });
}
