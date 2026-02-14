export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "json"
  | "relationship"
  | "formula"
  | "password"
  | "picklist"
  | "multipicklist";

/**
 * Field definition as stored in the database
 * Each field record has ID format: "appId:tableName:fieldName"
 */
export default interface TableField {
  /** The app this field belongs to */
  app: string;

  /** The table_name this field belongs to */
  table_name: string;

  /** The field name */
  name: string;

  /** Field description */
  description: string;

  /** Field data type */
  type: FieldType;

  /** Whether the field is required */
  required?: boolean;

  /** For relationship fields - the related table (format: "appId:tableName") */
  related_to?: string;

  /** Default value for the field */
  default_value?: any;

  /** For picklist/multipicklist fields - the available options */
  options?: { [id: string]: string };
}
