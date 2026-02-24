export type FilterOperator =
  | "="
  | "<"
  | ">"
  | "<="
  | ">="
  | "!="
  | "IN"
  | "NOT IN"
  | "LIKE"
  | "NOT LIKE";

export interface FieldFilter {
  field: string;
  operator: FilterOperator;
  /** Scalar for most operators; array for IN / NOT IN */
  value: string | number | boolean | (string | number)[];
}

export default interface RecordFilter<T = object> {
  ids?: string[];
  fields?: Partial<{ [K in keyof T]: T[K] }>;
  filters?: FieldFilter[];
  limit?: number;
  offset?: number;
  includeRelated?: string[]; // Array of relationship field names to include in the response
}
