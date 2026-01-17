export default interface RecordFilter {
  ids?: string[];
  fields?: Record<string, any>;
  limit?: number;
  offset?: number;
  includeRelated?: string[]; // Array of relationship field names to include in the response
}
