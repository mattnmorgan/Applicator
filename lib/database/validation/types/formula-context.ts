import Field from "@/lib/database/types/field";
import ReadResult from "@/lib/database/crud/types/read-result";

export default interface Context {
  id: string;
  record: Record<string, any>;
  field: Field;
  query: (
    appId: string,
    tableName: string,
    filter?: {
      fields?: Record<string, any>;
      limit?: number;
      offset?: number;
    },
  ) => Promise<ReadResult>;
}
