import CRUD from "@/lib/client/database/crud/";
import TableField from "@/lib/database/types/field";

export default class Manager extends CRUD<TableField> {
  tableId = "fields";
  appId = "system";
}
