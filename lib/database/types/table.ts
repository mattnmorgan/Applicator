import TableField from "@/lib/database/types/field";

export default interface Table {
  tableName: string;
  app: string;
  description: string;
  fields: TableField[];
}
