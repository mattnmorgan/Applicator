import TableRecord from "@/lib/database/crud/types/record";

export default interface Result<T = any> {
  records: TableRecord<T>[];
  total: number;
  limit: number;
  offset: number;
}
