import Record from "@/lib/database/crud/types/record";

export default interface BulkResult<T = any> {
  success: Record<T>[];
  failures: {
    id?: string;
    data?: any;
    error: string;
  }[];
}
