/**
 * Field type definition for table schemas
 */

/**
 * Available field types for table schemas
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'relationship'
  | 'formula';

/**
 * Field definition in a table schema
 */
export default interface TableField {
  /** Technical name of the field */
  name: string;

  /** Human-readable description of the field */
  description: string;

  /** Data type of the field */
  type: FieldType;

  /** Whether the field is required (cannot be used with formula fields) */
  required?: boolean;

  /** For relationship fields: the related table in format "[app-id]:[table-id]" */
  relatedTo?: string;

  /** Default value for the field */
  defaultValue?: any;
}
