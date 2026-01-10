/**
 * Table record type for storing data in the database
 */

/**
 * Record data with metadata
 */
export default interface TableRecord<T = any> {
  /** Unique identifier for the record */
  id: string;

  /** The actual data fields */
  data: T;

  /** Timestamp when the record was created */
  createdAt: string;

  /** Timestamp when the record was last updated */
  updatedAt: string;
}
