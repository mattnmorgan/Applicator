export default interface TableRecord<T = any, J = Record<string, any>> {
  id: string;
  data: T;
  created_at: number;
  updated_at: number;
  /** Data from LEFT JOINs requested via `RecordFilter.joins`, keyed by `JoinSpec.as` */
  joined?: { [alias: string]: J | null };
}
