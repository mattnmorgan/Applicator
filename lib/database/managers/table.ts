import CRUD from "@/lib/database/crud";
import Table from "@/lib/database/types/table";

export default class TableManager extends CRUD<Table> {
  tableName = "table";
  appId = "system";
}
