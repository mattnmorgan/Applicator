export default interface RecordFilter {
  ids?: string[];
  fields?: Record<string, any>;
  limit?: number;
  offset?: number;
}
