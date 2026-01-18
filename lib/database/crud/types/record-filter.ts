export default interface RecordFilter<T = object> {
  ids?: string[];
  fields?: Partial<{ [K in keyof T]: T[K] }>;
  limit?: number;
  offset?: number;
  includeRelated?: string[]; // Array of relationship field names to include in the response
}
