import TableField from "@/lib/database/types/field";

export default interface Table {
  name: string;
  description: string;
  fields: TableField[];
}
