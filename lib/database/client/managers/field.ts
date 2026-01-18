import CRUD from "@/lib/database/client/crud";
import TableField from "@/lib/database/types/field";

export default class Manager extends CRUD<TableField> {
  tableId = "field";
  appId = "system";
}
