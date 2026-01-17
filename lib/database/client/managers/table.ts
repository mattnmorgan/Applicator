import CRUD from "@/lib/database/client/crud";
import TableDefinition from "@/lib/database/types/table";

export default class Manager extends CRUD<TableDefinition> {
  tableId = "table";
  appId = "system";
}
