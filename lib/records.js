"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordManager = void 0;
exports.createRecordManager = createRecordManager;
const redis_1 = require("./redis");
const uuid_1 = require("uuid");
/**
 * RecordManager provides sandboxed CRUD operations for app-specific records.
 * Each app's records are isolated using Redis key prefixing: `app:{appId}:records:{recordId}`
 */
class RecordManager {
    constructor(options) {
        this.appId = options.appId;
        this.keyPrefix = `app:${this.appId}:records:`;
    }
    /**
     * Get the Redis key for a specific record
     */
    getRecordKey(recordId) {
        return `${this.keyPrefix}${recordId}`;
    }
    /**
     * Create a new record
     * @param data The data to store in the record
     * @param customId Optional custom ID for the record (defaults to UUID)
     * @returns The created record with metadata
     */
    async create(data, customId) {
        const redis = (0, redis_1.getRedisClient)();
        const id = customId || (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const record = {
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
    async read(recordId) {
        const redis = (0, redis_1.getRedisClient)();
        const key = this.getRecordKey(recordId);
        const data = await redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    /**
     * Update a record by ID
     * @param recordId The ID of the record to update
     * @param data The new data (will be merged with existing data)
     * @param replace If true, replaces the entire data object instead of merging
     * @returns The updated record if found, null otherwise
     */
    async update(recordId, data, replace = false) {
        const redis = (0, redis_1.getRedisClient)();
        const existing = await this.read(recordId);
        if (!existing) {
            return null;
        }
        const updatedData = replace ? data : Object.assign(Object.assign({}, existing.data), data);
        const updatedRecord = Object.assign(Object.assign({}, existing), { data: updatedData, updatedAt: new Date().toISOString() });
        const key = this.getRecordKey(recordId);
        await redis.set(key, JSON.stringify(updatedRecord));
        return updatedRecord;
    }
    /**
     * Delete a record by ID
     * @param recordId The ID of the record to delete
     * @returns True if the record was deleted, false if it didn't exist
     */
    async delete(recordId) {
        const redis = (0, redis_1.getRedisClient)();
        const key = this.getRecordKey(recordId);
        const result = await redis.del(key);
        return result > 0;
    }
    /**
     * List all records for this app
     * @param options Pagination and filtering options
     * @returns Paginated list of records
     */
    async list(options = {}) {
        const redis = (0, redis_1.getRedisClient)();
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
        const records = [];
        if (paginatedKeys.length > 0) {
            const values = await redis.mget(...paginatedKeys);
            for (const value of values) {
                if (value) {
                    records.push(JSON.parse(value));
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
    async exists(recordId) {
        const redis = (0, redis_1.getRedisClient)();
        const key = this.getRecordKey(recordId);
        const result = await redis.exists(key);
        return result > 0;
    }
    /**
     * Count all records for this app
     * @param pattern Optional pattern to filter records
     * @returns The number of records
     */
    async count(pattern) {
        const redis = (0, redis_1.getRedisClient)();
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
    async deleteAll() {
        const redis = (0, redis_1.getRedisClient)();
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
    async batchCreate(dataArray) {
        const redis = (0, redis_1.getRedisClient)();
        const now = new Date().toISOString();
        const records = [];
        const pipeline = redis.pipeline();
        for (const data of dataArray) {
            const id = (0, uuid_1.v4)();
            const record = {
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
    async batchRead(recordIds) {
        if (recordIds.length === 0) {
            return [];
        }
        const redis = (0, redis_1.getRedisClient)();
        const keys = recordIds.map((id) => this.getRecordKey(id));
        const values = await redis.mget(...keys);
        return values.map((value) => {
            if (!value) {
                return null;
            }
            return JSON.parse(value);
        });
    }
    /**
     * Batch delete multiple records by IDs
     * @param recordIds Array of record IDs to delete
     * @returns The number of records deleted
     */
    async batchDelete(recordIds) {
        if (recordIds.length === 0) {
            return 0;
        }
        const redis = (0, redis_1.getRedisClient)();
        const keys = recordIds.map((id) => this.getRecordKey(id));
        const result = await redis.del(...keys);
        return result;
    }
}
exports.RecordManager = RecordManager;
/**
 * Factory function to create a RecordManager instance for an app
 * @param appId The ID of the app
 * @returns A RecordManager instance
 */
function createRecordManager(appId) {
    return new RecordManager({ appId });
}
