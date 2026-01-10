/**
 * Table definition type for database schemas
 */

import TableField from './field';

/**
 * Table definition in an app
 */
export default interface TableDefinition {
  /** Technical name of the table */
  name: string;

  /** Human-readable description of the table */
  description: string;

  /** Collection of fields in the table */
  fields: TableField[];
}
