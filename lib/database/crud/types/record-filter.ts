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
  | "NOT LIKE"
  | "ILIKE"
  | "NOT ILIKE";

export interface FieldFilter {
  field: string;
  operator: FilterOperator;
  /** Scalar for most operators; array for IN / NOT IN */
  value: string | number | boolean | (string | number)[];
}

export default interface RecordFilter<T = object> {
  ids?: string[];
  fields?: Partial<{ [K in keyof T]: T[K] }>;
  /**
   * Array of filter conditions. Each entry is referenced 1-based in `condition`.
   * If `condition` is omitted, all filters are ANDed together.
   */
  filters?: FieldFilter[];
  /**
   * Optional logical expression combining filter indices.
   * e.g. "1 AND (2 OR 3)" — indices are 1-based, operators are AND / OR,
   * parentheses control grouping.
   * Defaults to ANDing all filters when omitted.
   */
  condition?: string;
  limit?: number;
  offset?: number;
  includeRelated?: string[];
}
