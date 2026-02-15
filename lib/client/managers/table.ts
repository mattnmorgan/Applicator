import CRUD from "@/lib/client/database/crud/";
import TableDefinition from "@/lib/database/types/table";

export default class Manager extends CRUD<TableDefinition> {
  tableId = "app_tables";
  appId = "system";
}
