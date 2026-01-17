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

export default interface TableField {
  name: string;
  description: string;
  type: FieldType;
  required?: boolean;
  relatedTo?: string;
  defaultValue?: any;
  options?: { [id: string]: string };
}
