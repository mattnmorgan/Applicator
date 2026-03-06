import TableRecord from "@/lib/database/crud/types/record";

export default interface Result<T = any, J = Record<string, any>> {
  records: TableRecord<T, J>[];
  total: number;
  limit: number;
  offset: number;
  related?: Record<string, Record<string, TableRecord[]>>; // Map of record ID -> relationship field -> related records
}
