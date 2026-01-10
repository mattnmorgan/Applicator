/**
 * Operation-related types for the generic data model
 */

import TableRecord from '@/lib/database/types/tableRecord';

/**
 * Options for creating a record
 */
export interface CreateRecordOptions {
  /** Custom ID for the record (defaults to UUID) */
  id?: string;

  /** Skip validation (use with caution) */
  skipValidation?: boolean;
}

/**
 * Options for updating a record
 */
export interface UpdateRecordOptions {
  /** Skip validation (use with caution) */
  skipValidation?: boolean;

  /** Replace entire data object instead of merging */
  replace?: boolean;
}

/**
 * Filter options for reading records
 */
export interface RecordFilter {
  /** Filter by specific IDs */
  ids?: string[];

  /** Field-based filters (field name -> value) */
  fields?: Record<string, any>;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult<T = any> {
  /** Successfully processed records */
  success: TableRecord<T>[];

  /** Failed operations with error details */
  failures: Array<{
    id?: string;
    data?: any;
    error: string;
  }>;
}

/**
 * Result of a record read operation
 */
export interface RecordReadResult<T = any> {
  /** Found records */
  records: TableRecord<T>[];

  /** Total count matching filter */
  total: number;

  /** Applied limit */
  limit: number;

  /** Applied offset */
  offset: number;
}
